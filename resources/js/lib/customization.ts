import { type CSSProperties } from 'react';

import { type User } from '@/types';

export interface Customization {
    background?: string;
    banner?: string;
    banner_text?: string | null;
}

export interface CustomizationImages {
    background: string | null;
    banner: string | null;
}

const art = (file: string) => `url(/images/customization/${file})`;

/** Built-in page backgrounds. The keys match CustomizationController::PRESETS. */
export const backgrounds: {
    key: string;
    label: string;
    style: CSSProperties;
}[] = [
    {
        key: 'sunset',
        label: 'მზის ჩასვლა',
        style: {
            backgroundImage:
                'linear-gradient(160deg, #f97316, #db2777 55%, #4c1d95)',
        },
    },
    {
        key: 'ocean',
        label: 'ოკეანე',
        style: {
            backgroundImage: 'linear-gradient(160deg, #0ea5e9, #1e3a8a)',
        },
    },
    {
        key: 'forest',
        label: 'ტყე',
        style: {
            backgroundImage: 'linear-gradient(160deg, #22c55e, #064e3b)',
        },
    },
    {
        key: 'night',
        label: 'ღამის გზა',
        style: { backgroundImage: art('bg-lanes.svg'), backgroundSize: '80px' },
    },
    {
        key: 'signs',
        label: 'ნიშნები',
        style: {
            backgroundImage: art('bg-signs.svg'),
            backgroundSize: '120px',
        },
    },
];

/** Built-in Home banners. */
export const banners: { key: string; label: string; style: CSSProperties }[] = [
    {
        key: 'road',
        label: 'გზა',
        style: { backgroundImage: art('banner-road.svg') },
    },
    {
        key: 'city',
        label: 'ქალაქი',
        style: { backgroundImage: art('banner-city.svg') },
    },
    {
        key: 'mountains',
        label: 'მთები',
        style: { backgroundImage: art('banner-mountains.svg') },
    },
    {
        key: 'sunset',
        label: 'მზის ჩასვლა',
        style: {
            backgroundImage:
                'linear-gradient(120deg, #f97316, #db2777 55%, #4c1d95)',
        },
    },
];

const cover: CSSProperties = {
    backgroundSize: 'cover',
    backgroundPosition: 'center',
};

/**
 * The style for the user's chosen background or banner, or null when there
 * is none (or their photo is missing, e.g. after restoring on a new phone).
 */
export function customizationStyle(
    user: User | null | undefined,
    type: 'background' | 'banner',
): CSSProperties | null {
    const customization = (user?.customization ?? {}) as Customization;
    const images = user?.customization_images as
        | CustomizationImages
        | undefined;
    const choice = customization[type];

    if (!choice || choice === 'none') return null;
    if (choice === 'photo') {
        const url = images?.[type];
        return url ? { ...cover, backgroundImage: `url("${url}")` } : null;
    }

    const preset = (type === 'background' ? backgrounds : banners).find(
        (p) => p.key === choice,
    );
    if (!preset) return null;

    return preset.style.backgroundSize
        ? preset.style
        : { ...cover, ...preset.style };
}
