import { router } from '@inertiajs/react';
import {
    type MouseEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { ImageViewer } from '@/components/zoomable-image';
import { useAppearance } from '@/hooks/use-appearance';

let diagramCount = 0;

/**
 * Renders a chapter's HTML. Chapter links navigate inside the app, every
 * picture opens the zoom viewer, and flowcharts are drawn with Mermaid, which
 * is only loaded on chapters that have one.
 */
export function RulesContent({ html }: { html: string }) {
    const container = useRef<HTMLDivElement>(null);
    const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(
        null,
    );
    const { resolvedAppearance } = useAppearance();
    const closeViewer = useCallback(() => setZoomed(null), []);

    useEffect(() => {
        const diagrams = [
            ...(container.current?.querySelectorAll<HTMLElement>(
                '.rules-mermaid',
            ) ?? []),
        ];
        if (!diagrams.length) return;

        let cancelled = false;
        void import('mermaid').then(async ({ default: mermaid }) => {
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'strict',
                theme: resolvedAppearance === 'dark' ? 'dark' : 'default',
                fontFamily: 'inherit',
            });

            for (const element of diagrams) {
                const source = decodeURIComponent(
                    element.dataset.diagram ?? '',
                );
                try {
                    const { svg } = await mermaid.render(
                        `rules-diagram-${++diagramCount}`,
                        source,
                    );
                    if (!cancelled) element.innerHTML = svg;
                } catch {
                    if (!cancelled) element.textContent = source;
                }
            }
        });

        return () => {
            cancelled = true;
        };
    }, [html, resolvedAppearance]);

    const handleClick = (e: MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;

        const link = target.closest<HTMLAnchorElement>('a[data-rule-link]');
        if (link) {
            e.preventDefault();
            router.visit(`/rules/${link.dataset.ruleLink}`);
            return;
        }

        if (target instanceof HTMLImageElement) {
            setZoomed({ src: target.src, alt: target.alt });
            return;
        }

        const diagram = target.closest<HTMLElement>('.rules-mermaid');
        const svg = diagram?.querySelector('svg');
        if (svg) {
            const markup = new XMLSerializer().serializeToString(svg);
            setZoomed({
                src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`,
                alt: '',
            });
        }
    };

    return (
        <>
            <div
                ref={container}
                className="rules-content"
                onClick={handleClick}
                dangerouslySetInnerHTML={{ __html: html }}
            />
            {zoomed && (
                <ImageViewer
                    src={zoomed.src}
                    alt={zoomed.alt}
                    onClose={closeViewer}
                />
            )}
        </>
    );
}
