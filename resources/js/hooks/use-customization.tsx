import { useSyncExternalStore } from 'react';

export const accents = [
    'default',
    'blue',
    'green',
    'teal',
    'purple',
    'orange',
    'rose',
] as const;
export type Accent = (typeof accents)[number];

export const textSizes = ['small', 'normal', 'large', 'xlarge'] as const;
export type TextSize = (typeof textSizes)[number];

interface Customization {
    accent: Accent;
    textSize: TextSize;
}

const listeners = new Set<() => void>();
let current: Customization = { accent: 'default', textSize: 'normal' };

const read = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const write = (key: string, value: string): void => {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Storage blocked: the choice lasts for this session.
    }
};

/** Accent and text size live on <html> as data attributes that app.css reads. */
const apply = ({ accent, textSize }: Customization): void => {
    if (typeof document === 'undefined') return;

    document.documentElement.dataset.accent = accent;
    document.documentElement.dataset.textSize = textSize;
};

export function initializeCustomization(): void {
    const accent = read('accent') as Accent | null;
    const textSize = read('textSize') as TextSize | null;
    current = {
        accent: accent && accents.includes(accent) ? accent : 'default',
        textSize:
            textSize && textSizes.includes(textSize) ? textSize : 'normal',
    };
    apply(current);
}

const update = (patch: Partial<Customization>): void => {
    current = { ...current, ...patch };
    if (patch.accent) write('accent', patch.accent);
    if (patch.textSize) write('textSize', patch.textSize);
    apply(current);
    listeners.forEach((listener) => listener());
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

export function useCustomization() {
    const value = useSyncExternalStore(
        subscribe,
        () => current,
        () => current,
    );

    return {
        ...value,
        setAccent: (accent: Accent) => update({ accent }),
        setTextSize: (textSize: TextSize) => update({ textSize }),
    } as const;
}
