/**
 * Overlays that close on back (Android back, or an X that calls
 * history.back()). Every overlay and the page underneath listen to the same
 * popstate, so a back press belongs to the overlay opened last; the overlays
 * below it and the page ignore it.
 */
const layers: object[] = [];
const claimed = new WeakSet<Event>();

export interface BackLayer {
    /** True when this back press is this overlay's to handle. */
    claim: (event: Event) => boolean;
    release: () => void;
}

export function openBackLayer(): BackLayer {
    const layer = {};
    layers.push(layer);

    return {
        claim(event) {
            if (claimed.has(event) || layers[layers.length - 1] !== layer) {
                return false;
            }
            claimed.add(event);
            return true;
        },
        release() {
            const index = layers.indexOf(layer);
            if (index >= 0) layers.splice(index, 1);
        },
    };
}

/** For a page's own back handling: false while an overlay owns the press. */
export function backIsForPage(event: Event): boolean {
    return !claimed.has(event) && layers.length === 0;
}
