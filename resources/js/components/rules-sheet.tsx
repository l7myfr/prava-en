import {
    ArrowLeft,
    BookOpen,
    ChevronRight,
    Lock,
    Search,
    X,
} from 'lucide-react';
import {
    useDeferredValue,
    useEffect,
    useEffectEvent,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

import { RulesContent } from '@/components/rules-content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/use-language';
import { openBackLayer } from '@/lib/back-layers';
import { searchRules } from '@/lib/rules-search';
import { cn } from '@/lib/utils';
import rules from '@/rules/chapters.json';

interface OpenChapter {
    slug: string;
    anchor: string | null;
    highlight: string;
}

type RulesLock = 'exam' | 'setting';

/**
 * A rules button for quiz screens. The rules open in a panel over the quiz,
 * so the question, the answers and the timer stay where they are. When
 * `locked` (the official mock exam, or a test set up without them) the panel
 * only says why they are off.
 */
export function RulesSheetButton({
    locked,
    className,
}: {
    locked?: RulesLock;
    className?: string;
}) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                variant="outline"
                size="icon"
                className={cn('relative h-8 w-8', className)}
                onClick={() => setOpen(true)}
            >
                <BookOpen
                    className={cn('h-4 w-4', locked && 'text-muted-foreground')}
                />
                {locked && (
                    <Lock className="absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full bg-background p-0.5 text-muted-foreground" />
                )}
                <span className="sr-only">{t('წესები')}</span>
            </Button>
            {open && (
                <RulesPanel locked={locked} onClose={() => setOpen(false)} />
            )}
        </>
    );
}

function RulesPanel({
    locked,
    onClose,
}: {
    locked?: RulesLock;
    onClose: () => void;
}) {
    const { language, t } = useLanguage();
    const [query, setQuery] = useState('');
    const [chapter, setChapter] = useState<OpenChapter | null>(null);
    const scroller = useRef<HTMLDivElement>(null);

    const deferredQuery = useDeferredValue(query.trim());
    const results = useMemo(
        () =>
            deferredQuery.length >= 2
                ? searchRules(deferredQuery, language)
                : null,
        [deferredQuery, language],
    );

    const openChapter = useMemo(
        () => rules.chapters.find((c) => c.slug === chapter?.slug),
        [chapter],
    );

    // Android back steps out of a chapter, then closes the panel, instead of
    // leaving the quiz
    const handleBack = useEffectEvent(() => {
        if (chapter) {
            setChapter(null);
            window.history.pushState(null, '', window.location.href);
        } else {
            onClose();
        }
    });

    useEffect(() => {
        const layer = openBackLayer();
        window.history.pushState(null, '', window.location.href);
        const handlePopState = (e: PopStateEvent) => {
            if (layer.claim(e)) handleBack();
        };
        window.addEventListener('popstate', handlePopState);
        return () => {
            layer.release();
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    useEffect(() => {
        const root = scroller.current;
        if (!root) return;
        const target = chapter?.anchor
            ? root.querySelector<HTMLElement>(`#${chapter.anchor}`)
            : null;
        if (target) {
            const timer = setTimeout(
                () => target.scrollIntoView({ block: 'start' }),
                50,
            );
            return () => clearTimeout(timer);
        }
        root.scrollTo(0, 0);
    }, [chapter]);

    const index = openChapter
        ? rules.chapters.findIndex((c) => c.slug === openChapter.slug)
        : -1;
    const previous = index > 0 ? rules.chapters[index - 1] : null;
    const next = index >= 0 ? rules.chapters[index + 1] : null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div
                className="absolute inset-0 animate-in bg-black/60 fade-in-0"
                onClick={onClose}
            />
            <div
                className={cn(
                    'relative flex animate-in flex-col rounded-t-2xl border-t bg-background shadow-xl duration-300 slide-in-from-bottom',
                    locked ? 'h-auto' : 'h-[88%]',
                )}
                style={{ paddingBottom: 'var(--inset-bottom, 0px)' }}
            >
                <div className="flex flex-none items-center gap-2 border-b px-3 py-2">
                    {openChapter ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => setChapter(null)}
                        >
                            <ArrowLeft className="h-5 w-5" />
                            <span className="sr-only">{t('ყველა თავი')}</span>
                        </Button>
                    ) : (
                        <BookOpen className="mx-2 h-5 w-5 shrink-0 text-primary" />
                    )}
                    <p className="min-w-0 flex-1 truncate font-semibold">
                        {openChapter
                            ? `${openChapter.slug} · ${openChapter.title[language]}`
                            : t('წესები')}
                    </p>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                        <span className="sr-only">{t('დახურვა')}</span>
                    </Button>
                </div>

                {locked ? (
                    <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                        <p className="font-medium">
                            {locked === 'exam'
                                ? t('საგამოცდო ტესტში წესები გამორთულია')
                                : t('ამ ტესტში წესები გამორთულია')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {locked === 'exam'
                                ? t(
                                      'ნამდვილ გამოცდაზეც ვერ ჩაიხედავ. წესები ხელმისაწვდომია ბილეთებში და შენ მიერ შექმნილ ტესტებში.',
                                  )
                                : t(
                                      'ტესტის შექმნისას ჩართე „წესები ტესტის დროს“, რომ ტესტის შიგნიდან ჩაიხედო.',
                                  )}
                        </p>
                    </div>
                ) : (
                    <div
                        ref={scroller}
                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                    >
                        {openChapter ? (
                            <article className="p-4 pb-8">
                                <RulesContent
                                    html={openChapter.html[language]}
                                    highlight={chapter?.highlight}
                                    onChapterLink={(slug) =>
                                        setChapter({
                                            slug,
                                            anchor: null,
                                            highlight: '',
                                        })
                                    }
                                />
                                <nav className="mt-8 grid grid-cols-2 gap-2">
                                    {previous ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setChapter({
                                                    slug: previous.slug,
                                                    anchor: null,
                                                    highlight: '',
                                                })
                                            }
                                            className="flex items-center gap-1 rounded-lg border p-2 text-left text-xs hover:bg-accent"
                                        >
                                            <ArrowLeft className="h-4 w-4 shrink-0" />
                                            <span className="line-clamp-2">
                                                {previous.title[language]}
                                            </span>
                                        </button>
                                    ) : (
                                        <span />
                                    )}
                                    {next ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setChapter({
                                                    slug: next.slug,
                                                    anchor: null,
                                                    highlight: '',
                                                })
                                            }
                                            className="flex items-center justify-end gap-1 rounded-lg border p-2 text-right text-xs hover:bg-accent"
                                        >
                                            <span className="line-clamp-2">
                                                {next.title[language]}
                                            </span>
                                            <ChevronRight className="h-4 w-4 shrink-0" />
                                        </button>
                                    ) : (
                                        <span />
                                    )}
                                </nav>
                            </article>
                        ) : (
                            <div className="space-y-3 p-4">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        value={query}
                                        onChange={(e) =>
                                            setQuery(e.target.value)
                                        }
                                        placeholder={t(
                                            'წესებში ძებნა… (მაგ. მობრუნება, 3.24)',
                                        )}
                                        className="h-11 pr-10 pl-9"
                                    />
                                    {query && (
                                        <button
                                            type="button"
                                            onClick={() => setQuery('')}
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                                        >
                                            <X className="h-4 w-4" />
                                            <span className="sr-only">
                                                {t('ძებნის გასუფთავება')}
                                            </span>
                                        </button>
                                    )}
                                </div>

                                {results ? (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            {t('{count} შედეგი', {
                                                count: results.length,
                                            })}
                                        </p>
                                        {results.map((result) => (
                                            <button
                                                type="button"
                                                key={`${result.slug}-${result.anchor}`}
                                                onClick={() =>
                                                    setChapter({
                                                        slug: result.slug,
                                                        anchor: result.anchor,
                                                        highlight:
                                                            deferredQuery,
                                                    })
                                                }
                                                className="block w-full rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent"
                                            >
                                                <p className="text-xs font-semibold text-primary">
                                                    {result.slug} ·{' '}
                                                    {result.chapterTitle}
                                                </p>
                                                <p className="mt-0.5 leading-snug font-medium">
                                                    {result.heading}
                                                </p>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {result.before}
                                                    {result.match && (
                                                        <mark className="rounded bg-yellow-300/80 px-0.5 text-foreground dark:bg-yellow-500/40">
                                                            {result.match}
                                                        </mark>
                                                    )}
                                                    {result.after}
                                                </p>
                                            </button>
                                        ))}
                                        {results.length === 0 && (
                                            <p className="py-8 text-center text-sm text-muted-foreground">
                                                {t('ვერაფერი მოიძებნა')}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid gap-2">
                                        {rules.chapters.map((item) => (
                                            <button
                                                type="button"
                                                key={item.slug}
                                                onClick={() =>
                                                    setChapter({
                                                        slug: item.slug,
                                                        anchor: null,
                                                        highlight: '',
                                                    })
                                                }
                                                className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent"
                                            >
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary tabular-nums">
                                                    {item.slug}
                                                </span>
                                                <span className="min-w-0 flex-1 leading-snug font-medium">
                                                    {item.title[language]}
                                                </span>
                                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
