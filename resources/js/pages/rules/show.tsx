import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, List } from 'lucide-react';
import { useEffect } from 'react';

import { RulesContent } from '@/components/rules-content';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import MobileLayout from '@/layouts/mobile-layout';
import rules from '@/rules/chapters.json';

export default function RulesShow({ chapter: slug }: { chapter: string }) {
    const { language, t } = useLanguage();
    const index = rules.chapters.findIndex((c) => c.slug === slug);
    const chapter = rules.chapters[index];
    const previous = rules.chapters[index - 1];
    const next = rules.chapters[index + 1];

    useEffect(() => {
        document.getElementById('main-scroll-container')?.scrollTo(0, 0);
    }, [slug]);

    if (!chapter) {
        return (
            <MobileLayout title="წესები">
                <p className="p-8 text-center text-muted-foreground">
                    {t('თავი ვერ მოიძებნა')}
                </p>
            </MobileLayout>
        );
    }

    return (
        <MobileLayout title="წესები">
            <Head title={chapter.title[language]} />

            <article className="p-4 pb-8">
                <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                    {t('თავი {number}', { number: chapter.slug })}
                </p>
                <h2 className="mb-3 text-xl leading-tight font-bold">
                    {chapter.title[language]}
                </h2>

                <RulesContent html={chapter.html[language]} />

                <nav className="mt-8 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
                    {previous ? (
                        <Link
                            href={`/rules/${previous.slug}`}
                            className="flex items-center gap-1 rounded-lg border p-2 text-left text-xs hover:bg-accent"
                        >
                            <ChevronLeft className="h-4 w-4 shrink-0" />
                            <span className="line-clamp-2">
                                {previous.title[language]}
                            </span>
                        </Link>
                    ) : (
                        <span />
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        asChild
                        className="h-auto"
                    >
                        <Link href="/rules">
                            <List className="h-4 w-4" />
                            <span className="sr-only">{t('ყველა თავი')}</span>
                        </Link>
                    </Button>
                    {next ? (
                        <Link
                            href={`/rules/${next.slug}`}
                            className="flex items-center justify-end gap-1 rounded-lg border p-2 text-right text-xs hover:bg-accent"
                        >
                            <span className="line-clamp-2">
                                {next.title[language]}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0" />
                        </Link>
                    ) : (
                        <span />
                    )}
                </nav>
            </article>
        </MobileLayout>
    );
}
