// Builds resources/js/i18n/content-en.json from the translated batches in
// .translation/out, keyed the same way the app looks strings up.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { contentKey } from '../resources/js/i18n/content-key.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = path.join(root, '.translation');
const georgian: Record<string, string> = JSON.parse(
    fs.readFileSync(path.join(work, 'keys.json'), 'utf8'),
);

const english: Record<string, string> = {};
for (const file of fs.readdirSync(path.join(work, 'out')).sort()) {
    if (file.endsWith('.json')) {
        Object.assign(
            english,
            JSON.parse(fs.readFileSync(path.join(work, 'out', file), 'utf8')),
        );
    }
}

const dictionary: Record<string, string> = {};
const missing: string[] = [];
for (const [id, text] of Object.entries(georgian)) {
    const translation = english[id]?.trim();
    if (!translation) {
        missing.push(id);
        continue;
    }
    const key = contentKey(text);
    if (dictionary[key] && dictionary[key] !== translation) {
        throw new Error(`Hash collision on ${id}`);
    }
    dictionary[key] = translation;
}

fs.writeFileSync(
    path.join(root, 'resources', 'js', 'i18n', 'content-en.json'),
    JSON.stringify(dictionary),
);
console.log(
    `${Object.keys(dictionary).length} strings translated, ${missing.length} still Georgian`,
);
