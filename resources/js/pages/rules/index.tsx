import { Head, Link } from '@inertiajs/react';
import { ChevronRight, Search, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';

import { RulesContent } from '@/components/rules-content';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/use-language';
import MobileLayout from '@/layouts/mobile-layout';
import { searchRules } from '@/lib/rules-search';
import rules from '@/rules/chapters.json';

export default function RulesIndex() {
    const { language, t } = useLanguage();
    const [query, setQuery] = useState(() => {
        try {
            return sessionStorage.getItem('rules.search') ?? '';
        } catch {
            return '';
        }
    });
    const deferredQuery = useDeferredValue(query.trim());
    const results = useMemo(
        () =>
            deferredQuery.length >= 2
                ? searchRules(deferredQuery, language)
                : null,
        [deferredQuery, language],
    );

    const changeQuery = (value: string) => {
        setQuery(value);
        try {
            sessionStorage.setItem('rules.search', value);
        } catch {
            // Storage blocked: the search just isn't remembered.
        }
    };

    return (
        <MobileLayout title="წესები">
            <Head title={t('წესები')} />

            <div className="space-y-4 p-4">
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        value={query}
                        onChange={(e) => changeQuery(e.target.value)}
                        placeholder={t('წესებში ძებნა… (მაგ. მობრუნება, 3.24)')}
                        className="h-11 pr-10 pl-9"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => changeQuery('')}
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
                            {t('{count} შედეგი', { count: results.length })}
                        </p>
                        {results.map((result) => (
                            <Link
                                key={`${result.slug}-${result.anchor}`}
                                href={`/rules/${result.slug}?q=${encodeURIComponent(deferredQuery)}${result.anchor ? `#${result.anchor}` : ''}`}
                                className="block rounded-xl border bg-card p-3 transition-colors hover:bg-accent"
                            >
                                <p className="text-xs font-semibold text-primary">
                                    {result.slug} · {result.chapterTitle}
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
                            </Link>
                        ))}
                        {results.length === 0 && (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                {t('ვერაფერი მოიძებნა')}
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid gap-2">
                            {rules.chapters.map((chapter) => (
                                <Link
                                    key={chapter.slug}
                                    href={`/rules/${chapter.slug}`}
                                    className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary tabular-nums">
                                        {chapter.slug}
                                    </span>
                                    <span className="min-w-0 flex-1 leading-snug font-medium">
                                        {chapter.title[language]}
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                </Link>
                            ))}
                        </div>

                        <div className="rounded-xl border bg-card p-4">
                            <RulesContent html={rules.index[language]} />
                        </div>
                    </>
                )}
            </div>
        </MobileLayout>
    );
}
