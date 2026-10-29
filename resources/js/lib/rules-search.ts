import { type Language } from '@/hooks/use-language';
import rules from '@/rules/chapters.json';

export interface RuleSection {
    slug: string;
    chapterTitle: string;
    heading: string;
    anchor: string | null;
    text: string;
}

export interface RuleMatch extends RuleSection {
    before: string;
    match: string;
    after: string;
    count: number;
}

const cache = new Map<Language, RuleSection[]>();

const plain = (html: string) => {
    const element = document.createElement('div');
    element.innerHTML = html;
    element.querySelectorAll('img').forEach((img) => {
        // Sign icons carry their number as alt text; keep it searchable
        img.replaceWith(img.alt ? ` ${img.alt} ` : ' ');
    });
    return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
};

/** Every chapter cut into its sections (split at h2/h3), as plain text. */
function sections(language: Language): RuleSection[] {
    const cached = cache.get(language);
    if (cached) return cached;

    const result: RuleSection[] = [];
    for (const chapter of rules.chapters) {
        const html = chapter.html[language];
        const parts = html.split(/(?=<h[23] id="s\d+">)/);
        for (const part of parts) {
            const heading = part.match(
                /^<h[23] id="(s\d+)">([\s\S]*?)<\/h[23]>/,
            );
            result.push({
                slug: chapter.slug,
                chapterTitle: chapter.title[language],
                heading: heading ? plain(heading[2]) : chapter.title[language],
                anchor: heading ? heading[1] : null,
                text: plain(heading ? part.slice(heading[0].length) : part),
            });
        }
    }

    cache.set(language, result);
    return result;
}

/**
 * Sections whose heading, chapter title or text contain every word of the
 * query, best first (heading hits, then more occurrences).
 */
export function searchRules(query: string, language: Language): RuleMatch[] {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];

    const matches: (RuleMatch & { score: number })[] = [];
    for (const section of sections(language)) {
        const haystack =
            `${section.chapterTitle} ${section.heading} ${section.text}`.toLowerCase();
        if (!words.every((word) => haystack.includes(word))) continue;

        const lowerText = section.text.toLowerCase();
        const first = words[0];
        const at = lowerText.indexOf(first);
        const count = words.reduce(
            (sum, word) => sum + (lowerText.split(word).length - 1),
            0,
        );
        const headingHit = words.some((word) =>
            section.heading.toLowerCase().includes(word),
        );

        const start = Math.max(0, at - 60);
        matches.push({
            ...section,
            before:
                at >= 0
                    ? (start > 0 ? '…' : '') + section.text.slice(start, at)
                    : '',
            match: at >= 0 ? section.text.slice(at, at + first.length) : '',
            after:
                at >= 0
                    ? section.text.slice(
                          at + first.length,
                          at + first.length + 110,
                      ) + '…'
                    : section.text.slice(0, 140) + '…',
            count,
            score: (headingHit ? 1000 : 0) + count,
        });
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, 60);
}
