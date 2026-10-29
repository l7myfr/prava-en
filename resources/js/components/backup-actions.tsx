import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { CloudCog, DatabaseBackup, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';

type Status =
    | { kind: 'idle' }
    | { kind: 'saving' }
    | { kind: 'saved'; location: string }
    | { kind: 'picking' }
    | { kind: 'searching' }
    | { kind: 'notFound' }
    | { kind: 'restoring' }
    | { kind: 'error'; message: string };

interface NativeEventDetail {
    event: string;
    payload: { uri?: string; found?: boolean; reason?: string };
}

/**
 * Back up progress to Download/PravaEN, or restore it from that file. The
 * backup also runs on its own while studying; these buttons are for doing it
 * on demand and for getting progress back after reinstalling the app.
 */
export function BackupActions({
    showSave = true,
    autoFind = false,
    className,
}: {
    showSave?: boolean;
    /**
     * Look for an earlier install's backup on mount and restore it (first
     * launch after a reinstall); falls back to letting the user pick the file.
     */
    autoFind?: boolean;
    className?: string;
}) {
    const { t } = useLanguage();
    const backup = usePage<SharedData>().props.backup as
        | { auto: boolean; last_saved_at: string | null }
        | null
        | undefined;
    const [autoBackup, setAutoBackup] = useState(backup?.auto ?? true);

    const toggleAutoBackup = async (enabled: boolean) => {
        setAutoBackup(enabled);
        try {
            await axios.post('/backup/settings', { auto: enabled });
            router.reload({ only: ['backup'] });
        } catch {
            setAutoBackup(!enabled);
        }
    };
    const [status, setStatus] = useState<Status>({ kind: 'idle' });
    const listener = useRef<((e: Event) => void) | null>(null);

    useEffect(
        () => () => {
            if (listener.current) {
                document.removeEventListener('native-event', listener.current);
            }
        },
        [],
    );

    const save = async () => {
        setStatus({ kind: 'saving' });
        try {
            const { data } = await axios.post('/backup/save');
            setStatus(
                data.success
                    ? { kind: 'saved', location: data.location }
                    : {
                          kind: 'error',
                          message: t('სარეზერვო ასლი ვერ შეინახა'),
                      },
            );
        } catch {
            setStatus({
                kind: 'error',
                message: t('სარეზერვო ასლი ვერ შეინახა'),
            });
        }
    };

    const restoreFrom = async (uri: string) => {
        setStatus({ kind: 'restoring' });
        try {
            const { data } = await axios.post('/backup/restore', { uri });
            if (data.success) {
                window.location.href = '/';
                return;
            }
            setStatus({ kind: 'error', message: data.message });
        } catch (error) {
            setStatus({
                kind: 'error',
                message:
                    axios.isAxiosError(error) && error.response?.data?.message
                        ? error.response.data.message
                        : t('აღდგენა ვერ მოხერხდა'),
            });
        }
    };

    /** Answers from the device arrive as native events, not as responses. */
    const listen = (
        event: string,
        handle: (detail: NativeEventDetail) => void,
    ) => {
        if (listener.current) {
            document.removeEventListener('native-event', listener.current);
        }
        listener.current = (e: Event) => {
            const detail = (e as CustomEvent<NativeEventDetail>).detail;
            if (detail?.event !== event) return;
            document.removeEventListener('native-event', listener.current!);
            listener.current = null;
            handle(detail);
        };
        document.addEventListener('native-event', listener.current);
    };

    const restore = async () => {
        listen('file:chosen', (detail) => {
            if (detail.payload?.uri) void restoreFrom(detail.payload.uri);
        });

        setStatus({ kind: 'picking' });
        try {
            await axios.post('/backup/pick');
        } catch {
            setStatus({ kind: 'error', message: t('აღდგენა ვერ მოხერხდა') });
        }
    };

    // First launch after a reinstall: look for the backup picture the earlier
    // install left (asks for photo access) and restore it without the user
    // having to know where the file is. Once per launch.
    useEffect(() => {
        if (!autoFind) return;
        try {
            if (sessionStorage.getItem('restore.searched')) return;
            sessionStorage.setItem('restore.searched', '1');
        } catch {
            // Storage blocked: search anyway, just this once per mount.
        }

        setStatus({ kind: 'searching' });
        listen('backup:found', (detail) => {
            if (detail.payload?.found && detail.payload.uri) {
                void restoreFrom(detail.payload.uri);
            } else {
                setStatus({ kind: 'notFound' });
            }
        });
        axios.post('/backup/find').catch(() => setStatus({ kind: 'notFound' }));
        // listen/restoreFrom only use stable setters
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoFind]);

    const busy = ['saving', 'restoring', 'searching'].includes(status.kind);
    const rowClass =
        'flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50 disabled:opacity-50';

    return (
        <div className={cn('divide-y', className)}>
            {showSave && (
                <label className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium">
                    <CloudCog className="h-5 w-5 text-primary" />
                    <div className="min-w-0 flex-1 text-left">
                        <span>{t('ავტომატური სარეზერვო ასლი')}</span>
                        <p className="text-xs text-muted-foreground">
                            {t('სწავლისას თავისით ინახება Download/PravaEN-ში')}
                        </p>
                    </div>
                    <Switch
                        checked={autoBackup}
                        onCheckedChange={toggleAutoBackup}
                    />
                </label>
            )}
            {showSave && (
                <button
                    type="button"
                    onClick={save}
                    disabled={busy}
                    className={rowClass}
                >
                    {status.kind === 'saving' ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                        <DatabaseBackup className="h-5 w-5 text-primary" />
                    )}
                    <div className="min-w-0 flex-1 text-left">
                        <span>{t('სარეზერვო ასლის შენახვა')}</span>
                        <p className="text-xs text-muted-foreground">
                            {status.kind === 'saved'
                                ? t('შენახულია: {location}', {
                                      location: status.location,
                                  })
                                : t('ავტომატურად ინახება Download/PravaEN-ში')}
                        </p>
                    </div>
                </button>
            )}
            <button
                type="button"
                onClick={restore}
                disabled={busy}
                className={rowClass}
            >
                {status.kind === 'restoring' || status.kind === 'searching' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                    <RotateCcw className="h-5 w-5 text-primary" />
                )}
                <div className="min-w-0 flex-1 text-left">
                    <span>{t('პროგრესის აღდგენა')}</span>
                    <p
                        className={cn(
                            'text-xs',
                            status.kind === 'error'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-muted-foreground',
                        )}
                    >
                        {status.kind === 'error'
                            ? status.message
                            : status.kind === 'searching'
                              ? t('ვეძებ შენს წინა პროგრესს…')
                              : status.kind === 'restoring'
                                ? t('ვაღდგენ…')
                                : status.kind === 'notFound'
                                  ? t(
                                        'ავტომატურად ვერ ვიპოვე. შეეხე და აირჩიე prava-backup ფაილი.',
                                    )
                                  : status.kind === 'picking'
                                    ? t('აირჩიე prava-backup.json ფაილი')
                                    : t(
                                          'სარეზერვო ფაილიდან, ხელახალი ინსტალაციის შემდეგ',
                                      )}
                    </p>
                </div>
            </button>
        </div>
    );
}
