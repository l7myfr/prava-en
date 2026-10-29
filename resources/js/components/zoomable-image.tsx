import { Minus, Plus, X } from 'lucide-react';
import {
    type ImgHTMLAttributes,
    type PointerEvent as ReactPointerEvent,
    type WheelEvent as ReactWheelEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useLanguage } from '@/hooks/use-language';
import { openBackLayer } from '@/lib/back-layers';
import { cn } from '@/lib/utils';

const minScale = 1;
const maxScale = 6;
const doubleTapScale = 2.5;

interface Transform {
    scale: number;
    x: number;
    y: number;
}

const identity: Transform = { scale: 1, x: 0, y: 0 };

const clampScale = (scale: number) =>
    Math.min(maxScale, Math.max(minScale, scale));

interface ImageViewerProps {
    src: string;
    alt?: string;
    onClose: () => void;
}

/**
 * Fullscreen viewer: pinch or wheel to zoom, drag to pan, double-tap to
 * toggle zoom. Back closes it, like the other overlays in the app.
 */
export function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
    const { t } = useLanguage();
    const [transform, setTransform] = useState<Transform>(identity);
    const [animating, setAnimating] = useState(false);
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const gesture = useRef<{
        distance: number;
        scale: number;
        midX: number;
        midY: number;
        x: number;
        y: number;
    } | null>(null);
    const lastTap = useRef(0);
    const moved = useRef(false);

    useEffect(() => {
        window.history.pushState(
            { imageViewer: true },
            '',
            window.location.href,
        );

        // Only the viewer closes; the sheet or page underneath stays.
        const layer = openBackLayer();
        const handlePopState = (e: PopStateEvent) => {
            if (layer.claim(e)) onClose();
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') window.history.back();
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('keydown', handleKey);

        return () => {
            layer.release();
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    const close = useCallback(() => window.history.back(), []);

    const zoomAround = useCallback(
        (nextScale: number, originX: number, originY: number) => {
            setTransform((current) => {
                const scale = clampScale(nextScale);
                if (scale === 1) return identity;
                const ratio = scale / current.scale;

                return {
                    scale,
                    x: originX - (originX - current.x) * ratio,
                    y: originY - (originY - current.y) * ratio,
                };
            });
        },
        [],
    );

    const centreOf = (e: { clientX: number; clientY: number }) => ({
        x: e.clientX - window.innerWidth / 2,
        y: e.clientY - window.innerHeight / 2,
    });

    const handlePointerDown = (e: ReactPointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, centreOf(e));
        moved.current = false;
        setAnimating(false);

        const points = [...pointers.current.values()];
        if (points.length === 2) {
            const [a, b] = points;
            gesture.current = {
                distance: Math.hypot(a.x - b.x, a.y - b.y),
                scale: transform.scale,
                midX: (a.x + b.x) / 2,
                midY: (a.y + b.y) / 2,
                x: transform.x,
                y: transform.y,
            };
        }
    };

    const handlePointerMove = (e: ReactPointerEvent) => {
        const previous = pointers.current.get(e.pointerId);
        if (!previous) return;
        const point = centreOf(e);
        pointers.current.set(e.pointerId, point);

        const points = [...pointers.current.values()];
        if (points.length === 2 && gesture.current) {
            const [a, b] = points;
            const start = gesture.current;
            const scale = clampScale(
                (start.scale * Math.hypot(a.x - b.x, a.y - b.y)) /
                    start.distance,
            );
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            const ratio = scale / start.scale;
            moved.current = true;
            setTransform({
                scale,
                x: midX - (start.midX - start.x) * ratio,
                y: midY - (start.midY - start.y) * ratio,
            });
        } else if (points.length === 1) {
            const dx = point.x - previous.x;
            const dy = point.y - previous.y;
            if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
            setTransform((current) =>
                current.scale === 1
                    ? current
                    : { ...current, x: current.x + dx, y: current.y + dy },
            );
        }
    };

    const handlePointerUp = (e: ReactPointerEvent) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) gesture.current = null;
        if (pointers.current.size > 0 || moved.current) return;

        const now = Date.now();
        if (now - lastTap.current < 300) {
            lastTap.current = 0;
            setAnimating(true);
            const point = centreOf(e);
            if (transform.scale > 1) {
                setTransform(identity);
            } else {
                zoomAround(doubleTapScale, point.x, point.y);
            }
        } else {
            lastTap.current = now;
        }
    };

    const handleWheel = (e: ReactWheelEvent) => {
        const point = centreOf(e);
        setAnimating(false);
        zoomAround(
            transform.scale * Math.exp(-e.deltaY * 0.002),
            point.x,
            point.y,
        );
    };

    const stepZoom = (factor: number) => {
        setAnimating(true);
        zoomAround(transform.scale * factor, 0, 0);
    };

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            className="fixed inset-0 z-[100] flex touch-none flex-col bg-black/95 select-none"
        >
            <div
                className="relative flex-1 overflow-hidden"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
            >
                <img
                    src={src}
                    alt={alt}
                    draggable={false}
                    className={cn(
                        'absolute inset-0 m-auto max-h-full max-w-full object-contain p-2',
                        animating && 'transition-transform duration-200',
                    )}
                    style={{
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    }}
                />
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end p-3 pt-[calc(var(--inset-top,0px)+0.75rem)]">
                <button
                    type="button"
                    onClick={close}
                    className="pointer-events-auto rounded-full bg-white/15 p-2.5 text-white backdrop-blur"
                >
                    <X className="h-5 w-5" />
                    <span className="sr-only">{t('დახურვა')}</span>
                </button>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 p-4 pb-[calc(var(--inset-bottom,0px)+1rem)]">
                <button
                    type="button"
                    onClick={() => stepZoom(1 / 1.5)}
                    disabled={transform.scale <= minScale}
                    className="pointer-events-auto rounded-full bg-white/15 p-3 text-white backdrop-blur disabled:opacity-40"
                >
                    <Minus className="h-5 w-5" />
                </button>
                <span className="min-w-14 text-center text-sm font-medium text-white/80 tabular-nums">
                    {Math.round(transform.scale * 100)}%
                </span>
                <button
                    type="button"
                    onClick={() => stepZoom(1.5)}
                    disabled={transform.scale >= maxScale}
                    className="pointer-events-auto rounded-full bg-white/15 p-3 text-white backdrop-blur disabled:opacity-40"
                >
                    <Plus className="h-5 w-5" />
                </button>
            </div>
        </div>,
        document.body,
    );
}

type ZoomableImageProps = ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
    /** Image to open in the viewer, when it differs from the thumbnail. */
    zoomSrc?: string;
    wrapperClassName?: string;
};

/** An image that opens the fullscreen zoom viewer when tapped. */
export function ZoomableImage({
    zoomSrc,
    wrapperClassName,
    alt,
    src,
    ...imageProps
}: ZoomableImageProps) {
    const [open, setOpen] = useState(false);
    const handleClose = useCallback(() => setOpen(false), []);

    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(true);
                }}
                className={cn('block w-full cursor-zoom-in', wrapperClassName)}
            >
                <img src={src} alt={alt} {...imageProps} />
            </button>
            {open && (
                <ImageViewer
                    src={zoomSrc ?? src}
                    alt={alt}
                    onClose={handleClose}
                />
            )}
        </>
    );
}
