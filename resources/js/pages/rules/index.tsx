import { Head, Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

import { RulesContent } from '@/components/rules-content';
import { useLanguage } from '@/hooks/use-language';
import MobileLayout from '@/layouts/mobile-layout';
import rules from '@/rules/chapters.json';

export default function RulesIndex() {
    const { language, t } = useLanguage();

    return (
        <MobileLayout title="წესები">
            <Head title={t('წესები')} />

            <div className="space-y-4 p-4">
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
            </div>
        </MobileLayout>
    );
}
