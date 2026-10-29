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
export function RulesContent({
    html,
    highlight,
}: {
    html: string;
    /** Words from a rules search to mark in the text. */
    highlight?: string;
}) {
    const container = useRef<HTMLDivElement>(null);
    const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(
        null,
    );
    const { resolvedAppearance } = useAppearance();
    const closeViewer = useCallback(() => setZoomed(null), []);

    // Mark search words in the rendered text (not inside flowcharts)
    useEffect(() => {
        const root = container.current;
        const words = (highlight ?? '')
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length >= 2);
        if (!root || !words.length) return;

        const pattern = new RegExp(
            `(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
            'gi',
        );
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) =>
                node.parentElement?.closest('.rules-mermaid, mark') ||
                !pattern.test(node.textContent ?? '')
                    ? NodeFilter.FILTER_REJECT
                    : NodeFilter.FILTER_ACCEPT,
        });
        const nodes: Text[] = [];
        while (walker.nextNode()) nodes.push(walker.currentNode as Text);

        for (const node of nodes) {
            const fragment = document.createDocumentFragment();
            for (const piece of (node.textContent ?? '').split(pattern)) {
                if (!piece) continue;
                if (words.includes(piece.toLowerCase())) {
                    const mark = document.createElement('mark');
                    mark.className =
                        'rounded bg-yellow-300/80 px-0.5 text-foreground dark:bg-yellow-500/40';
                    mark.textContent = piece;
                    fragment.append(mark);
                } else {
                    fragment.append(piece);
                }
            }
            node.replaceWith(fragment);
        }
    }, [html, highlight]);

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
