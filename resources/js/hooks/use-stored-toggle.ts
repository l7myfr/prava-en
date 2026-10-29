import { useCallback, useState } from 'react';

/**
 * An on/off setting remembered on this device, for practice preferences that
 * should survive leaving the page. Falls back to the default when storage is
 * unavailable.
 */
export function useStoredToggle(
    key: string,
    initial: boolean,
): [boolean, (value: boolean) => void] {
    const [value, setValue] = useState(() => {
        try {
            const stored = localStorage.getItem(key);
            return stored === null ? initial : stored === '1';
        } catch {
            return initial;
        }
    });

    const update = useCallback(
        (next: boolean) => {
            setValue(next);
            try {
                localStorage.setItem(key, next ? '1' : '0');
            } catch {
                // Storage blocked: the choice lasts for this page only.
            }
        },
        [key],
    );

    return [value, update];
}
