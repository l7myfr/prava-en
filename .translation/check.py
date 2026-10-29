import json, os, re, sys

root = os.path.dirname(os.path.abspath(__file__))
geo = re.compile('[ა-ჿ]')
banned = re.compile(r'\binfantry\b|\bfootman\b|\bfoot soldier', re.I)


def wanted(node, keys):
    if isinstance(node, dict):
        if 'k' in node and 'ka' in node:
            keys[node['k']] = node['ka']
        for v in node.values():
            wanted(v, keys)
    elif isinstance(node, list):
        for v in node:
            wanted(v, keys)


def check(n):
    name = f'b{int(n):02d}.json'
    keys = {}
    with open(os.path.join(root, 'batches', name), encoding='utf-8') as f:
        wanted(json.load(f), keys)
    path = os.path.join(root, 'out', name)
    if not os.path.exists(path):
        return [f'{name}: no output file']
    try:
        with open(path, encoding='utf-8') as f:
            out = json.load(f)
    except ValueError as e:
        return [f'{name}: invalid JSON: {e}']
    problems = []
    for k, ka in keys.items():
        en = out.get(k)
        if not isinstance(en, str) or not en.strip():
            problems.append(f'{k}: missing')
            continue
        if geo.search(en):
            problems.append(f'{k}: still contains Georgian: {en[:80]}')
        if banned.search(en):
            problems.append(f'{k}: banned word (pedestrian, not infantry): {en[:80]}')
        if len(ka) > 40 and not (0.45 < len(en) / len(ka) < 2.2):
            problems.append(f'{k}: suspicious length ({len(en)} vs {len(ka)} Georgian chars)')
        for num in set(re.findall(r'\d+(?:[.,]\d+)*', ka)):
            if num not in en and num.replace(',', '.') not in en:
                problems.append(f'{k}: number {num} missing')
    for k in out:
        if k not in keys:
            problems.append(f'{k}: not in this batch')
    return problems


if __name__ == '__main__':
    targets = sys.argv[1:] or [f[1:3] for f in sorted(os.listdir(os.path.join(root, 'batches')))]
    total = 0
    for n in targets:
        p = check(n)
        total += len(p)
        print(f'b{int(n):02d}: {"OK" if not p else str(len(p)) + " problem(s)"}')
        for line in p:
            print('  ' + line)
    sys.exit(1 if total else 0)
