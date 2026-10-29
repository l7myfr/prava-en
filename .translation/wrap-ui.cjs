// Wraps Georgian UI strings in t(...) and injects `const { t } = useLanguage();`
// into the enclosing component/hook. Prints anything it could not handle.
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const geo = /[ა-ჿ]/;
const dry = process.argv.includes('--dry');
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const manual = [];

const isComponentName = (n) => /^(use[A-Z]|[A-Z])/.test(n);

function enclosingComponent(node) {
    let fn = null;
    for (let p = node.parent; p; p = p.parent) {
        if (ts.isFunctionDeclaration(p) || ts.isArrowFunction(p) || ts.isFunctionExpression(p)) {
            let name = p.name && p.name.text;
            if (!name && ts.isVariableDeclaration(p.parent)) name = p.parent.name.text;
            if (name && isComponentName(name)) fn = p;
        }
    }
    return fn;
}

function inParameters(node, fn) {
    for (let p = node.parent; p && p !== fn; p = p.parent) {
        if (ts.isParameter(p)) return true;
    }
    return false;
}

const quote = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";

for (const rel of files) {
    const file = path.join(root, rel);
    const src = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const edits = [];
    const needsT = new Set();

    const visit = (node) => {
        let text = null;
        let kind = null;
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            if (geo.test(node.text)) { text = node.text; kind = 'string'; }
        } else if (ts.isJsxText(node)) {
            if (geo.test(node.text)) { text = node.text.replace(/\s+/g, ' ').trim(); kind = 'jsx'; }
        } else if (ts.isTemplateExpression(node)) {
            if (geo.test(node.getText(sf))) {
                manual.push(`${rel}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1} template: ${node.getText(sf).slice(0, 90)}`);
                return;
            }
        }
        if (text !== null) {
            const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
            const fn = enclosingComponent(node);
            const parent = node.parent;
            const isImportOrType = ts.isImportDeclaration(parent) || ts.isLiteralTypeNode(parent);
            const isJsxAttr = ts.isJsxAttribute(parent);
            if (!fn || inParameters(node, fn) || isImportOrType) {
                manual.push(`${rel}:${line} ${fn ? 'in parameters' : 'outside component'}: ${text.slice(0, 80)}`);
            } else if (ts.isBinaryExpression(parent) && /===|!==|==|!=/.test(parent.operatorToken.getText(sf))) {
                manual.push(`${rel}:${line} comparison: ${text.slice(0, 80)}`);
            } else {
                needsT.add(fn);
                let replacement;
                if (kind === 'jsx') {
                    const raw = node.text;
                    const lead = raw.match(/^\s*/)[0];
                    const trail = raw.match(/\s*$/)[0];
                    const keepLead = lead && !lead.includes('\n') ? ' ' : '';
                    const keepTrail = trail && !trail.includes('\n') ? ' ' : '';
                    replacement = `${keepLead ? "{' '}" : ''}{t(${quote(text)})}${keepTrail ? "{' '}" : ''}`;
                } else {
                    replacement = isJsxAttr ? `{t(${quote(text)})}` : `t(${quote(text)})`;
                }
                edits.push({ start: node.getStart(sf), end: node.getEnd(), replacement });
            }
            return;
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);

    for (const fn of needsT) {
        const body = fn.body;
        if (!body) continue;
        if (ts.isBlock(body)) {
            if (/const \{[^}]*\bt\b[^}]*\} = useLanguage\(\)/.test(body.getText(sf))) continue;
            edits.push({ start: body.getStart(sf) + 1, end: body.getStart(sf) + 1, replacement: '\n    const { t } = useLanguage();\n' });
        } else {
            const line = sf.getLineAndCharacterOfPosition(fn.getStart(sf)).line + 1;
            manual.push(`${rel}:${line} expression-bodied component needs t manually`);
        }
    }

    if (!edits.length) continue;
    let out = src;
    for (const e of edits.sort((a, b) => b.start - a.start)) {
        out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
    }
    if (!/from '@\/hooks\/use-language'/.test(out)) {
        const imports = [...out.matchAll(/^import [\s\S]*?;\n/gm)];
        const at = imports.length ? imports[imports.length - 1].index + imports[imports.length - 1][0].length : 0;
        out = out.slice(0, at) + "import { useLanguage } from '@/hooks/use-language';\n" + out.slice(at);
    }
    console.log(`${rel}: ${edits.length} edit(s)`);
    if (!dry) fs.writeFileSync(file, out);
}

if (manual.length) {
    console.log('\nMANUAL:');
    for (const m of manual) console.log('  ' + m);
}
