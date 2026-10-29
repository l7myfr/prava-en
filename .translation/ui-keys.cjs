const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const geo = /[ა-ჿ]/;
const keys = [];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : /\.tsx?$/.test(d.name) ? [path.join(dir, d.name)] : []);
for (const file of walk(path.join(root, 'resources/js'))) {
    if (/i18n|language-toggle/.test(file)) continue;
    const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (n) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && geo.test(n.text) && !keys.includes(n.text)) keys.push(n.text);
        if (ts.isJsxText(n) && geo.test(n.text)) console.error('LEFTOVER JSX TEXT', file, n.text.trim());
        ts.forEachChild(n, visit);
    };
    visit(sf);
}
fs.writeFileSync(path.join(__dirname, 'ui-keys.json'), JSON.stringify(keys, null, 0));
console.log(keys.length + ' keys');
console.log(keys.join('\n'));
