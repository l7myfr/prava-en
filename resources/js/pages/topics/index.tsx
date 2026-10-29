import { Head, router } from '@inertiajs/react';
import {
    BookOpen,
    Check,
    CheckSquare,
    ClipboardList,
    RotateCcw,
    Square,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import MobileLayout from '@/layouts/mobile-layout';
import { cn } from '@/lib/utils';

type TopicStatus = 'new' | 'weak' | 'progress' | 'done';

interface Topic {
    id: number;
    name: string;
    total: number;
    answered: number;
    correct: number;
    status: TopicStatus;
}

interface Props {
    topics: Topic[];
    licenseType: { id: number; code: string; name: string } | null;
}

const statusStyles: Record<TopicStatus, { card: string; bar: string }> = {
    new: {
        card: 'border-border bg-card',
        bar: 'bg-muted-foreground/30',
    },
    weak: {
        card: 'border-red-500/50 bg-red-50 dark:bg-red-950/40',
        bar: 'bg-red-500',
    },
    progress: {
        card: 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/40',
        bar: 'bg-amber-500',
    },
    done: {
        card: 'border-green-500/50 bg-green-50 dark:bg-green-950/40',
        bar: 'bg-green-500',
    },
};

const legend: [TopicStatus, string][] = [
    ['new', 'დასაწყები'],
    ['progress', 'მიმდინარე'],
    ['weak', 'ბევრი შეცდომა'],
    ['done', 'ნასწავლი'],
];

export default function TopicsIndex({ topics, licenseType }: Props) {
    const { t, tc } = useLanguage();
    const [selecting, setSelecting] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);
    const [resetTopic, setResetTopic] = useState<Topic | null>(null);

    const selectedCount = useMemo(
        () =>
            topics
                .filter((topic) => selected.includes(topic.id))
                .reduce((sum, topic) => sum + topic.total, 0),
        [topics, selected],
    );

    const toggle = (id: number) =>
        setSelected((current) =>
            current.includes(id)
                ? current.filter((x) => x !== id)
                : [...current, id],
        );

    const practise = (ids: number[]) =>
        router.visit(
            `/questions?resume=1&categories=${ids.join(',')}${licenseType ? `&license_type=${licenseType.id}` : ''}`,
        );

    const test = (ids: number[]) =>
        router.visit(`/test?categories=${ids.join(',')}`);

    const handleTopicClick = (topic: Topic) => {
        if (selecting) {
            toggle(topic.id);
        } else {
            practise([topic.id]);
        }
    };

    const confirmReset = () => {
        if (!resetTopic) return;
        router.post(
            `/topics/${resetTopic.id}/reset`,
            {},
            { preserveScroll: true, onFinish: () => setResetTopic(null) },
        );
    };

    return (
        <MobileLayout title="თემები">
            <Head title={t('თემები')} />

            <div className="space-y-3 p-4 pb-28">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                        {licenseType
                            ? t('{code} კატეგორიის თემები', {
                                  code: licenseType.code,
                              })
                            : t('ყველა თემა')}
                    </p>
                    <Button
                        variant={selecting ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setSelecting(!selecting);
                            setSelected([]);
                        }}
                    >
                        {selecting ? (
                            <X className="h-4 w-4" />
                        ) : (
                            <CheckSquare className="h-4 w-4" />
                        )}
                        {selecting ? t('გაუქმება') : t('რამდენიმეს არჩევა')}
                    </Button>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {legend.map(([status, label]) => (
                        <span key={status} className="flex items-center gap-1">
                            <span
                                className={cn(
                                    'h-2.5 w-2.5 rounded-full',
                                    statusStyles[status].bar,
                                )}
                            />
                            {t(label)}
                        </span>
                    ))}
                </div>

                {topics.map((topic, index) => {
                    const isSelected = selected.includes(topic.id);
                    const answeredShare = topic.total
                        ? (topic.answered / topic.total) * 100
                        : 0;

                    return (
                        <div
                            key={topic.id}
                            className={cn(
                                'flex items-stretch overflow-hidden rounded-xl border-2 transition-colors',
                                statusStyles[topic.status].card,
                                isSelected && 'ring-2 ring-primary',
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => handleTopicClick(topic)}
                                className="flex min-w-0 flex-1 items-start gap-3 p-3 text-left"
                            >
                                {selecting ? (
                                    isSelected ? (
                                        <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                                    ) : (
                                        <Square className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                                    )
                                ) : (
                                    <span className="mt-0.5 w-6 shrink-0 text-right text-sm font-semibold text-muted-foreground tabular-nums">
                                        {index + 1}.
                                    </span>
                                )}
                                <span className="min-w-0 flex-1 space-y-1.5">
                                    <span className="block leading-snug font-medium">
                                        {tc(topic.name)}
                                    </span>
                                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                            <span
                                                className={cn(
                                                    'block h-full rounded-full',
                                                    statusStyles[topic.status]
                                                        .bar,
                                                )}
                                                style={{
                                                    width: `${answeredShare}%`,
                                                }}
                                            />
                                        </span>
                                        <span className="tabular-nums">
                                            {topic.answered}/{topic.total}
                                        </span>
                                        {topic.answered > 0 && (
                                            <span className="flex items-center gap-0.5 text-green-600 tabular-nums dark:text-green-400">
                                                <Check className="h-3 w-3" />
                                                {topic.correct}
                                            </span>
                                        )}
                                        {topic.answered - topic.correct > 0 && (
                                            <span className="flex items-center gap-0.5 text-red-600 tabular-nums dark:text-red-400">
                                                <X className="h-3 w-3" />
                                                {topic.answered - topic.correct}
                                            </span>
                                        )}
                                    </span>
                                </span>
                            </button>
                            {!selecting && (
                                <div className="flex shrink-0 flex-col border-l border-border/60">
                                    <button
                                        type="button"
                                        onClick={() => test([topic.id])}
                                        className="flex flex-1 items-center justify-center px-3 text-muted-foreground hover:text-foreground"
                                    >
                                        <ClipboardList className="h-4 w-4" />
                                        <span className="sr-only">
                                            {t('ტესტი')}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setResetTopic(topic)}
                                        disabled={topic.answered === 0}
                                        className="flex flex-1 items-center justify-center border-t border-border/60 px-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        <span className="sr-only">
                                            {t('თავიდან დაწყება')}
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {selecting && selected.length > 0 && (
                <div className="fixed inset-x-0 bottom-[calc(4rem+var(--inset-bottom,0px))] z-40 border-t bg-background/95 p-3 backdrop-blur">
                    <div className="mx-auto flex max-w-3xl items-center gap-2">
                        <span className="flex-1 text-sm text-muted-foreground">
                            {t('{topics} თემა · {questions} კითხვა', {
                                topics: selected.length,
                                questions: selectedCount,
                            })}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => practise(selected)}
                        >
                            <BookOpen className="h-4 w-4" />
                            {t('ვარჯიში')}
                        </Button>
                        <Button size="sm" onClick={() => test(selected)}>
                            <ClipboardList className="h-4 w-4" />
                            {t('ტესტი')}
                        </Button>
                    </div>
                </div>
            )}

            <AlertDialog
                open={resetTopic !== null}
                onOpenChange={(open) => !open && setResetTopic(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('თემის თავიდან დაწყება?')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(
                                'ამ თემის პასუხების ისტორია წაიშლება. შენახული კითხვები და შენიშვნები დარჩება.',
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('გაუქმება')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmReset}>
                            {t('თავიდან დაწყება')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MobileLayout>
    );
}
