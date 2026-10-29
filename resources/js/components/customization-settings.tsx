import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Ban, Check, ImagePlus, Loader2 } from 'lucide-react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { Events, IsMobile, Camera as NativeCamera, Off, On } from '#nativephp';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/use-language';
import {
    backgrounds,
    banners,
    type Customization,
    type CustomizationImages,
} from '@/lib/customization';
import { getGalleryTarget, setGalleryTarget } from '@/lib/gallery-target';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';

type Slot = 'background' | 'banner';

const reloadUser = () => router.reload({ only: ['auth'] });

/**
 * Settings → Appearance: pick a page background and a Home banner (built-in
 * design or own photo) and the banner's text. Saved per profile.
 */
export function CustomizationSettings() {
    const { t } = useLanguage();
    const { auth } = usePage<SharedData>().props;
    const customization = (auth.user?.customization ?? {}) as Customization;
    const images = auth.user?.customization_images as
        | CustomizationImages
        | undefined;
    const [busy, setBusy] = useState<Slot | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const fileSlot = useRef<Slot>('background');

    const save = async (patch: Partial<Customization>) => {
        setError(null);
        await axios.post('/customization', patch);
        reloadUser();
    };

    const uploadPhoto = async (slot: Slot, dataUrl: string) => {
        setBusy(slot);
        setError(null);
        try {
            await axios.post('/customization/image', {
                type: slot,
                image_base64: dataUrl,
            });
            reloadUser();
        } catch {
            setError(t('სურათი ვერ შეინახა'));
        } finally {
            setBusy(null);
        }
    };

    // Native gallery picks arrive as an event with a file path on the device
    useEffect(() => {
        const handleMediaSelected = async (payload: {
            success: boolean;
            files?: { path: string }[];
        }) => {
            const slot = getGalleryTarget();
            if (slot === 'profile') return;
            setGalleryTarget('profile');
            const path = payload.success ? payload.files?.[0]?.path : null;
            if (!path) return;

            try {
                const response = await fetch(
                    `/native-file/preview?path=${encodeURIComponent(path)}&preview=1`,
                );
                const { dataUrl } = await response.json();
                if (dataUrl) await uploadPhoto(slot, dataUrl);
            } catch {
                setError(t('სურათი ვერ შეინახა'));
            }
        };

        const mediaEvent =
            Events?.Gallery?.MediaSelected ||
            'Native\\Mobile\\Events\\Gallery\\MediaSelected';
        On(mediaEvent, handleMediaSelected);

        return () => Off(mediaEvent, handleMediaSelected);
        // uploadPhoto only depends on stable setters and t
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pickPhoto = async (slot: Slot) => {
        let isNative = false;
        try {
            isNative = await IsMobile();
        } catch {
            isNative = false;
        }

        if (isNative) {
            setGalleryTarget(slot);
            await NativeCamera.pickImages().images().id(`custom-${slot}`);
        } else {
            fileSlot.current = slot;
            fileInput.current?.click();
        }
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () =>
            uploadPhoto(fileSlot.current, reader.result as string);
        reader.readAsDataURL(file);
    };

    const tile = (
        slot: Slot,
        key: string,
        label: string,
        style: CSSProperties | null,
        tall: boolean,
    ) => {
        const selected = (customization[slot] ?? 'none') === key;
        const isPhoto = key === 'photo';

        return (
            <button
                key={key}
                type="button"
                onClick={() =>
                    isPhoto ? pickPhoto(slot) : save({ [slot]: key })
                }
                className={cn(
                    'relative flex items-center justify-center overflow-hidden rounded-lg border bg-muted/50 ring-offset-2 ring-offset-background transition-all',
                    tall ? 'h-16' : 'h-12',
                    selected && 'ring-2 ring-primary',
                )}
                style={style ?? undefined}
            >
                {key === 'none' && (
                    <Ban className="h-5 w-5 text-muted-foreground" />
                )}
                {isPhoto &&
                    (busy === slot ? (
                        <Loader2 className="h-5 w-5 animate-spin text-white drop-shadow" />
                    ) : (
                        <ImagePlus
                            className={cn(
                                'h-5 w-5',
                                style
                                    ? 'text-white drop-shadow'
                                    : 'text-muted-foreground',
                            )}
                        />
                    ))}
                {selected && !isPhoto && key !== 'none' && (
                    <Check className="h-4 w-4 text-white drop-shadow" />
                )}
                <span className="sr-only">{t(label)}</span>
            </button>
        );
    };

    const photoStyle = (slot: Slot): CSSProperties | null =>
        images?.[slot]
            ? {
                  backgroundImage: `url("${images[slot]}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
              }
            : null;

    return (
        <>
            <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                    {t('ფონი')}
                </h4>
                <div className="grid grid-cols-4 gap-2">
                    {tile('background', 'none', 'არცერთი', null, true)}
                    {backgrounds.map((b) =>
                        tile('background', b.key, b.label, b.style, true),
                    )}
                    {tile(
                        'background',
                        'photo',
                        'შენი ფოტო',
                        photoStyle('background'),
                        true,
                    )}
                </div>
            </div>

            <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                    {t('ბანერი')}
                </h4>
                <div className="grid grid-cols-3 gap-2">
                    {tile('banner', 'none', 'არცერთი', null, false)}
                    {banners.map((b) =>
                        tile('banner', b.key, b.label, b.style, false),
                    )}
                    {tile(
                        'banner',
                        'photo',
                        'შენი ფოტო',
                        photoStyle('banner'),
                        false,
                    )}
                </div>
                <Input
                    key={customization.banner_text ?? ''}
                    defaultValue={customization.banner_text ?? ''}
                    maxLength={60}
                    placeholder={t('ბანერის ტექსტი')}
                    className="mt-2"
                    onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value !== (customization.banner_text ?? '')) {
                            save({ banner_text: value || null });
                        }
                    }}
                />
            </div>

            {error && (
                <p className="text-xs text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}

            <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
            />
        </>
    );
}
