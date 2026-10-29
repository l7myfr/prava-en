import sqlite3, json, re, sys, os
root = os.path.dirname(os.path.abspath(__file__))
pack = sqlite3.connect(os.path.join(root, '..', 'public', 'question-bank-2026-08.sqlite'))
seed = sqlite3.connect(os.path.join(root, '..', 'database', 'seeded.sqlite'))
prefix = 'ბილეთის განმარტება: ბილეთის გვერდი'
geo = re.compile('[ა-ჿ]')
norm = lambda s: s.replace('\r\n', '\n').strip()
keys = {}
def key(text):
    t = norm(text)
    if not t or not geo.search(t): return None, t
    if t in keys: return keys[t], t
    keys[t] = 's%d' % (len(keys) + 1)
    return keys[t], t
def item(text, fresh):
    if text is None: return None
    k, t = key(text)
    if k is None: return None
    if fresh is not None and k in fresh: return {'ctx': t}
    if fresh is not None: fresh.add(k)
    shown = t[len(prefix):].strip() if t.startswith(prefix) else t
    return {'k': k, 'ka': shown}
fresh = set()
misc = []
for table, db, cols in [('question_categories', pack, ['name']), ('license_types', seed, ['name']), ('sign_categories', seed, ['name']), ('sign_category_notes', seed, ['content'])]:
    for row in db.execute(f'select id, {",".join(cols)} from {table} order by id'):
        for col, v in zip(cols, row[1:]):
            it = item(v, fresh)
            if it: misc.append({'id': f'{table}.{row[0]}.{col}', **it})
signs = []
for sid, title, title_en, desc in seed.execute('select id, title, title_en, description from signs order by sign_category_id, position'):
    e = {'id': f'sign.{sid}', 'title': item(title, fresh), 'description': item(desc, fresh)}
    if title_en: e['old_english_title_unreliable'] = title_en
    signs.append(e)
cats = dict(pack.execute('select id, name from question_categories'))
qs = []
for qid, cid, q, d, fd in pack.execute('select id, question_category_id, question, description, full_description from questions order by question_category_id, id'):
    answers = [item(t, fresh) for (t,) in pack.execute('select text from answers where question_id=? order by position', (qid,))]
    e = {'id': f'q{qid}', 'topic': cats.get(cid), 'question': item(q, fresh), 'answers': [a for a in answers if a], 'explanation': item(d, fresh)}
    extra = item(fd, fresh)
    if extra: e['extra'] = extra
    qs.append(e)
def size(e): return sum(len(v['ka']) for v in json.loads(json.dumps(e), object_hook=lambda o: o).__iter__() if False) if False else len(json.dumps(e, ensure_ascii=False))
batches, cur, cur_size = [], [], 0
limit = 30000
for e in [{'kind': 'misc', 'items': misc}] + [{'kind': 'sign', **s} for s in signs] + [{'kind': 'question', **q} for q in qs]:
    if e['kind'] == 'misc':
        batches.append([e]); continue
    n = sum(len(x['ka']) for x in [e.get('question'), e.get('explanation'), e.get('extra'), e.get('title'), e.get('description')] + e.get('answers', []) if x and 'ka' in x)
    if cur and (cur_size + n > limit or cur[0]['kind'] != e['kind']):
        batches.append(cur); cur, cur_size = [], 0
    cur.append(e); cur_size += n
if cur: batches.append(cur)
for i, b in enumerate(batches, 1):
    with open(os.path.join(root, 'batches', f'b{i:02d}.json'), 'w', encoding='utf-8') as f:
        json.dump(b, f, ensure_ascii=False, indent=1)
with open(os.path.join(root, 'keys.json'), 'w', encoding='utf-8') as f:
    json.dump({k: t for t, k in keys.items()}, f, ensure_ascii=False)
print(len(batches), 'batches,', len(keys), 'strings,', sum(len(t) for t in keys), 'chars')
