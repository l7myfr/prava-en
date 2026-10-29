import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';

/**
 * Jump to the very top or bottom of the page's scroll area
 * (#main-scroll-container). Hidden while there is nothing to scroll.
 */
export function ScrollJumpButtons({
    bottom = 'calc(var(--inset-bottom, 0px) + 5rem)',
    className,
}: {
    /** CSS bottom offset, to sit above bars or other floating buttons. */
    bottom?: string;
    className?: string;
}) {
    const { t } = useLanguage();
    const [scrollable, setScrollable] = useState(false);

    useEffect(() => {
        const container = document.getElementById('main-scroll-container');
        if (!container) return;

        const measure = () =>
            setScrollable(container.scrollHeight > container.clientHeight + 80);
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(container);
        if (container.firstElementChild) {
            observer.observe(container.firstElementChild);
        }

        return () => observer.disconnect();
    }, []);

    const jump = (to: 'top' | 'bottom') => {
        const container = document.getElementById('main-scroll-container');
        container?.scrollTo({
            top: to === 'top' ? 0 : container.scrollHeight,
            behavior: 'smooth',
        });
    };

    if (!scrollable) return null;

    const buttonClass =
        'flex h-10 w-10 items-center justify-center rounded-full border bg-background/90 text-foreground shadow-md backdrop-blur transition-colors hover:bg-accent';

    return (
        <div
            className={cn('fixed left-4 z-20 flex flex-col gap-2', className)}
            style={{ bottom }}
        >
            <button
                type="button"
                className={buttonClass}
                onClick={() => jump('top')}
            >
                <ArrowUp className="h-5 w-5" />
                <span className="sr-only">{t('ზემოთ')}</span>
            </button>
            <button
                type="button"
                className={buttonClass}
                onClick={() => jump('bottom')}
            >
                <ArrowDown className="h-5 w-5" />
                <span className="sr-only">{t('ქვემოთ')}</span>
            </button>
        </div>
    );
}
