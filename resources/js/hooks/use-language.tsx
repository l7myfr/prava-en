import { useCallback, useSyncExternalStore } from 'react';

import { contentKey } from '@/i18n/content-key';
import { uiEnglish } from '@/i18n/ui-en';

export type Language = 'ka' | 'en';

type ContentDictionary = Record<string, string>;

const listeners = new Set<() => void>();
let currentLanguage: Language = 'en';
let englishContent: ContentDictionary | null = null;
let englishContentLoading: Promise<void> | null = null;

const getStoredLanguage = (): Language => {
    if (typeof window === 'undefined') return 'en';

    try {
        return localStorage.getItem('language') === 'ka' ? 'ka' : 'en';
    } catch {
        return 'en';
    }
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

const applyLanguage = (language: Language): void => {
    if (typeof document === 'undefined') return;

    document.documentElement.lang = language;
};

/**
 * English content is ~1.5 MB, so it is split into its own chunk and only
 * loaded once English is actually picked.
 */
const loadEnglishContent = (): Promise<void> => {
    if (englishContent) return Promise.resolve();

    englishContentLoading ??= import('@/i18n/content-en.json').then(
        (module) => {
            englishContent = module.default as ContentDictionary;
            notify();
        },
    );

    return englishContentLoading;
};

export function initializeLanguage(): void {
    currentLanguage = getStoredLanguage();
    applyLanguage(currentLanguage);

    if (currentLanguage === 'en') {
        void loadEnglishContent();
    }
}

export function setLanguage(language: Language): void {
    currentLanguage = language;

    try {
        localStorage.setItem('language', language);
    } catch {
        // Private mode: the choice just lasts for this session.
    }

    applyLanguage(language);

    if (language === 'en') {
        void loadEnglishContent();
    }

    notify();
}

const getLanguage = (): Language => currentLanguage;

const getContentVersion = (): ContentDictionary | null => englishContent;

export function interpolate(
    text: string,
    values?: Record<string, string | number>,
): string {
    if (!values) return text;

    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in values ? String(values[name]) : match,
    );
}

export function useLanguage() {
    const language = useSyncExternalStore(
        subscribe,
        getLanguage,
        () => 'en' as Language,
    );
    const content = useSyncExternalStore(
        subscribe,
        getContentVersion,
        () => null,
    );

    /** Interface text: the Georgian source string is the key. */
    const t = useCallback(
        (georgian: string, values?: Record<string, string | number>) =>
            interpolate(
                language === 'en'
                    ? (uiEnglish[georgian] ?? georgian)
                    : georgian,
                values,
            ),
        [language],
    );

    /**
     * Question bank content (questions, answers, explanations, signs, topics).
     * Looked up by a hash of the Georgian text, so a reworded question in a
     * new content pack falls back to Georgian instead of a stale translation.
     */
    const tc = useCallback(
        <T extends string | null | undefined>(georgian: T): T => {
            if (language !== 'en' || !georgian || !content) return georgian;

            return (content[contentKey(georgian)] ?? georgian) as T;
        },
        [language, content],
    );

    const toggleLanguage = useCallback(
        () => setLanguage(language === 'en' ? 'ka' : 'en'),
        [language],
    );

    return { language, setLanguage, toggleLanguage, t, tc } as const;
}
