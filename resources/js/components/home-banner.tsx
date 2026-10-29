import { usePage } from '@inertiajs/react';

import { type Customization, customizationStyle } from '@/lib/customization';
import { type SharedData } from '@/types';

/** The banner the user picked for Home, with their own line of text on it. */
export function HomeBanner() {
    const { auth } = usePage<SharedData>().props;
    const style = customizationStyle(auth.user, 'banner');
    const text = (auth.user?.customization as Customization | undefined)
        ?.banner_text;

    if (!style) return null;

    return (
        <div
            className="relative flex h-32 items-end overflow-hidden rounded-xl border shadow-sm"
            style={style}
        >
            {text && (
                <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <p className="relative p-4 text-lg leading-tight font-bold text-white drop-shadow">
                        {text}
                    </p>
                </>
            )}
        </div>
    );
}
