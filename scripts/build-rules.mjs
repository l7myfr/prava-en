// Converts the bilingual driving notes (an Obsidian vault) into the Rules
// section: resources/js/rules/chapters.json plus the images in
// public/images/rules. Run: node scripts/build-rules.mjs [vault folder]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { marked } from 'marked';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vault = path.resolve(
    process.argv[2] ??
        process.env.RULES_SOURCE ??
        path.join(root, '..', 'driving', 'non'),
);
const sources = { en: 'Driving Test (EN)', ka: 'მართვის მოწმობა (KA)' };
const imageDir = path.join(root, 'public', 'images', 'rules');
const indexSections = [2, 4];

const attachments = new Map();
const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else attachments.set(entry.name, full);
    }
};
walk(path.join(vault, 'attachments'));

const used = new Set();
const slugOf = (name) => name.match(/^(\d{2})\b/)?.[1] ?? null;

// Sign number -> picture, including range files like sign_1.4.1.-1.4.6.svg.
const signImages = new Map();
for (const file of attachments.keys()) {
    const range = file.match(/^sign_([\d.]+?)\.?(?:-([\d.]+?))?\.svg$/);
    if (!range) continue;
    const [, from, to] = range;
    signImages.set(from, file);
    const [head, first] = [from.replace(/\.\d+$/, ''), Number(from.split('.').pop())];
    const last = to ? Number(to.split('.').pop()) : first;
    for (let n = first; n <= last; n++) {
        if (!signImages.has(`${head}.${n}`)) signImages.set(`${head}.${n}`, file);
    }
}

const signContext = /(sign|plate|ნიშ|დაფ)[^.]{0,40}$/i;
const notSignContext = /(paragraph|article|annex|chapter|marking|line|პუნქტ|მუხლ|დანართ|თავ|მონიშვნ|ხაზ)[^.]{0,12}$/i;
const unitAfter = /^\s?(m\b|km|t\b|kg|%|s\b|°|min|h\b|sec|მ\b|კმ|ტ\b|კგ|წმ|წთ|სთ|ლ\b)/;

/**
 * Puts a small sign picture before sign numbers mentioned in running text.
 * Table rows that already show a picture, links and code are left alone.
 */
function addSignIcons(html) {
    return html.replace(/<tr>[\s\S]*?<\/tr>|<a [\s\S]*?<\/a>|<code>[\s\S]*?<\/code>|<[^>]+>|[^<]+/g, (part) => {
        if (part.startsWith('<')) {
            if (!part.startsWith('<tr>') || part.includes('<img')) return part;
            return part.replace(/(<t[dh][^>]*>)([\s\S]*?)(<\/t[dh]>)/g, (_, open, cell, close) =>
                open + addSignIcons(cell) + close,
            );
        }

        return part.replace(/(\d\.\d{1,2}(?:\.\d{1,2})?)(?![\d.]\d)/g, (number, _n, offset, text) => {
            const file = signImages.get(number);
            const before = text.slice(Math.max(0, offset - 50), offset);
            const after = text.slice(offset + number.length);
            const isBold = /<strong>$/.test(before);
            if (!file || unitAfter.test(after) || notSignContext.test(before)) return number;
            if (!isBold && !signContext.test(before) && !/^[,;)\s]*(\d\.\d|„|"|«)/.test(after) && !/[(,]\s*$/.test(before)) {
                return number;
            }
            used.add(file);

            return `<img class="rules-sign" src="/images/rules/${encodeURI(file)}" alt="${number}" loading="lazy">${number}`;
        });
    });
}

function convert(markdown, { signIcons = true } = {}) {
    const html = markdown
        .replace(/!\[\[([^\]|\\]+)(?:\\?\|(\d+))?\]\]/g, (_, file, width) => {
            file = file.trim();
            if (!attachments.has(file)) return '';
            used.add(file);
            const size = width ? ` style="width:min(100%,${width}px)"` : '';
            return `<img src="/images/rules/${encodeURI(file)}" alt="" loading="lazy"${size}>`;
        })
        .replace(/\[\[([^\]|\\]+)(?:\\?\|([^\]]+))?\]\]/g, (_, target, label) => {
            const name = path.basename(target.trim());
            const slug = slugOf(name);
            const text = (label ?? name.replace(/^\d{2}\s+/, '')).trim();

            return slug
                ? `<a href="/rules/${slug}" data-rule-link="${slug}">${text}</a>`
                : text;
        });

    const rendered = marked.parse(html, { gfm: true, breaks: false });

    return (signIcons ? addSignIcons(rendered) : rendered).replace(
        /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
        (_, code) =>
            `<div class="rules-mermaid" data-diagram="${encodeURIComponent(
                code
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&amp;/g, '&'),
            )}"></div>`,
    );
}

function splitSections(markdown) {
    const parts = markdown.split(/^(?=## )/m);
    return { head: parts[0], sections: parts.slice(1) };
}

const chapters = new Map();
const index = {};

for (const [language, folder] of Object.entries(sources)) {
    const dir = path.join(vault, folder);
    for (const file of fs.readdirSync(dir).sort()) {
        if (!file.endsWith('.md')) continue;
        const markdown = fs
            .readFileSync(path.join(dir, file), 'utf8')
            .replace(/\r\n/g, '\n');

        if (file === '_project.md') {
            const { sections } = splitSections(markdown);
            index[language] = convert(
                indexSections.map((n) => sections[n - 1] ?? '').join('\n'),
            );
            continue;
        }

        const slug = slugOf(file);
        if (!slug) continue;
        const title = (markdown.match(/^# (.+)$/m)?.[1] ?? file)
            .replace(/^\d{2}\s+/, '')
            .trim();
        const body = markdown.replace(/^# .+\n/, '');
        const chapter = chapters.get(slug) ?? { slug, title: {}, html: {} };
        chapter.title[language] = title;
        // Road markings reuse the sign numbering, so no sign icons there.
        chapter.html[language] = convert(body, { signIcons: slug !== '20' });
        chapters.set(slug, chapter);
    }
}

fs.rmSync(imageDir, { recursive: true, force: true });
fs.mkdirSync(imageDir, { recursive: true });
for (const file of used) {
    fs.copyFileSync(attachments.get(file), path.join(imageDir, file));
}

const out = {
    index,
    chapters: [...chapters.values()].sort((a, b) =>
        a.slug.localeCompare(b.slug),
    ),
};
fs.mkdirSync(path.join(root, 'resources', 'js', 'rules'), { recursive: true });
fs.writeFileSync(
    path.join(root, 'resources', 'js', 'rules', 'chapters.json'),
    JSON.stringify(out),
);

const missing = out.chapters.filter((c) => !c.html.en || !c.html.ka);
console.log(
    `${out.chapters.length} chapters, ${used.size} images` +
        (missing.length
            ? `; missing a language: ${missing.map((c) => c.slug).join(', ')}`
            : ''),
);
