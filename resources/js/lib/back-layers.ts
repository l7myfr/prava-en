import { router } from '@inertiajs/react';

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

const pathOf = (url: string) => {
    const { pathname, search } = new URL(url, window.location.origin);
    return pathname + search;
};

/**
 * Pages and overlays push extra history entries with the page's own URL so
 * they can catch back. Landing on one of them must not let Inertia restore
 * the page from the props it was first loaded with: that remounts it and
 * drops everything done since, like the answers in a running test. Inertia
 * leaves the page alone for a popstate without state, so a back press that
 * stays on the same URL reaches it without one. Capture runs before
 * Inertia's own listener.
 */
export function keepPageOnSameUrlBack(): void {
    let pageUrl = pathOf(window.location.href);
    router.on('navigate', (event) => {
        pageUrl = pathOf(event.detail.page.url);
    });

    window.addEventListener(
        'popstate',
        (event) => {
            if (pageUrl !== pathOf(window.location.href)) return;

            Object.defineProperty(event, 'state', { value: null });

            // Inertia scrolls to the top for a stateless popstate
            const { scrollX, scrollY } = window;
            requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
        },
        { capture: true },
    );
}
