import axios from 'axios';
import { Check, ImagePlus, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Events, Camera as NativeCamera, Off, On } from '#nativephp';
import { useLanguage } from '@/hooks/use-language';
import { getGalleryTarget, setGalleryTarget } from '@/lib/gallery-target';
import { cn } from '@/lib/utils';

const icons = [
    { key: 'default', src: '/images/app-icons/default.png' },
    { key: 'wheel', src: '/images/app-icons/wheel.svg' },
    { key: 'road', src: '/images/app-icons/road.svg' },
    { key: 'sign', src: '/images/app-icons/sign.svg' },
    { key: 'car', src: '/images/app-icons/car.svg' },
];

/**
 * Settings → Appearance → App icon (device only). The built-in designs change
 * the real launcher icon; a photo becomes a home-screen shortcut, because
 * Android cannot use an arbitrary picture as the app icon.
 */
export function AppIconPicker() {
    const { t } = useLanguage();
    const [current, setCurrent] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [pinning, setPinning] = useState(false);

    useEffect(() => {
        axios
            .get('/app-icon')
            .then(({ data }) => setCurrent(data.icon))
            .catch(() => setCurrent('default'));
    }, []);

    useEffect(() => {
        const handleMediaSelected = async (payload: {
            success: boolean;
            files?: { path: string }[];
        }) => {
            if (getGalleryTarget() !== 'icon') return;
            setGalleryTarget('profile');
            const path = payload.success ? payload.files?.[0]?.path : null;
            if (!path) return;

            setPinning(true);
            try {
                const { data } = await axios.post('/app-icon/photo', { path });
                setMessage(
                    data.success
                        ? t('დაადასტურე „მთავარ ეკრანზე დამატება“')
                        : t('შენი ტელეფონი ამას არ უჭერს მხარს'),
                );
            } catch {
                setMessage(t('ხატულა ვერ შეიცვალა'));
            } finally {
                setPinning(false);
            }
        };

        const mediaEvent =
            Events?.Gallery?.MediaSelected ||
            'Native\\Mobile\\Events\\Gallery\\MediaSelected';
        On(mediaEvent, handleMediaSelected);

        return () => Off(mediaEvent, handleMediaSelected);
        // t is stable enough for a message; re-registering would drop picks
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const choose = async (icon: string) => {
        setMessage(null);
        try {
            await axios.post('/app-icon', { icon });
            setCurrent(icon);
            setMessage(
                t('ხატულა შეიცვალა. შეიძლება რამდენიმე წამი დასჭირდეს.'),
            );
        } catch {
            setMessage(t('ხატულა ვერ შეიცვალა'));
        }
    };

    const pickPhoto = async () => {
        setMessage(null);
        setGalleryTarget('icon');
        await NativeCamera.pickImages().images().id('app-icon-photo');
    };

    return (
        <div>
            <div className="flex flex-wrap gap-3">
                {icons.map(({ key, src }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => choose(key)}
                        className={cn(
                            'relative h-14 w-14 overflow-hidden rounded-2xl shadow-sm ring-offset-2 ring-offset-background transition-all',
                            current === key && 'ring-2 ring-primary',
                        )}
                    >
                        <img src={src} alt="" className="h-full w-full" />
                        {current === key && (
                            <span className="absolute right-0.5 bottom-0.5 rounded-full bg-primary p-0.5 text-primary-foreground">
                                <Check className="h-3 w-3" />
                            </span>
                        )}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={pickPhoto}
                    disabled={pinning}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed text-muted-foreground"
                >
                    {pinning ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <ImagePlus className="h-5 w-5" />
                    )}
                    <span className="sr-only">{t('შენი ფოტო')}</span>
                </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
                {message ??
                    t('ფოტო მთავარ ეკრანზე ცალკე მალსახმობად დაემატება.')}
            </p>
        </div>
    );
}
