import { router } from '@inertiajs/react';

/**
 * The trail of pages visited in this session, so the Android back button and
 * back gesture return to where the user came from instead of always Home.
 */
const key = 'nav.trail';
const maxLength = 40;

const read = (): string[] => {
    try {
        return JSON.parse(sessionStorage.getItem(key) ?? '[]') as string[];
    } catch {
        return [];
    }
};

const write = (trail: string[]): void => {
    try {
        sessionStorage.setItem(key, JSON.stringify(trail.slice(-maxLength)));
    } catch {
        // Storage blocked: back falls back to the default page.
    }
};

const pathOf = (url: string): string => {
    const { pathname } = new URL(url, window.location.origin);
    return pathname;
};

/** A running or finished test, never a place to go back to. */
const isTestRun = (url: string) => /^\/test\/\d+/.test(pathOf(url));

/** Test setup opened from Topics: only a step on the way into the test. */
const isTopicTestSetup = (url: string) =>
    pathOf(url) === '/test' && url.includes('categories=');

const isEntryScreen = (url: string) => pathOf(url) === '/';

export function recordVisit(url: string): void {
    const trail = read();
    if (trail[trail.length - 1] !== url) {
        trail.push(url);
        write(trail);
    }
}

/**
 * Go to the page before the current one. Leaving a test also skips the test
 * pages and, for a topic test, its setup page, so a Topics test returns to
 * Topics. Falls back to `fallback` when there is nowhere to go.
 */
export function goBack(
    fallback = '/dashboard',
    { leavingTest = false } = {},
): void {
    const trail = read();
    const current = window.location.pathname + window.location.search;

    let index = trail.length - 1;
    while (index >= 0 && trail[index] === current) index--;

    while (
        index >= 0 &&
        (isTestRun(trail[index]) ||
            isEntryScreen(trail[index]) ||
            trail[index] === current ||
            (leavingTest && isTopicTestSetup(trail[index])))
    ) {
        index--;
    }

    const target = index >= 0 ? trail[index] : fallback;
    write(index >= 0 ? trail.slice(0, index + 1) : []);
    router.visit(target);
}
