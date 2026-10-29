/**
 * Key of a question bank string in content-en.json: a 53-bit hash of its
 * normalised Georgian text. Shared with scripts/build-content-en.ts, which
 * builds that dictionary, so the two always agree.
 */
export function contentKey(text: string): string {
    const normalised = text.replace(/\r\n/g, '\n').trim();
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;

    for (let i = 0; i < normalised.length; i++) {
        const ch = normalised.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
