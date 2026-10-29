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
    | { kind: 'restoring' }
    | { kind: 'error'; message: string };

interface NativeEventDetail {
    event: string;
    payload: { uri?: string };
}

/**
 * Back up progress to Download/PravaEN, or restore it from that file. The
 * backup also runs on its own while studying; these buttons are for doing it
 * on demand and for getting progress back after reinstalling the app.
 */
export function BackupActions({
    showSave = true,
    autoStartRestore = false,
    className,
}: {
    showSave?: boolean;
    /** Open the file picker on mount (first launch after a reinstall). */
    autoStartRestore?: boolean;
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

    const restore = async () => {
        if (listener.current) {
            document.removeEventListener('native-event', listener.current);
        }

        // The picked file comes back as a native event, not as the response.
        listener.current = async (e: Event) => {
            const detail = (e as CustomEvent<NativeEventDetail>).detail;
            if (detail?.event !== 'file:chosen' || !detail.payload?.uri) return;
            document.removeEventListener('native-event', listener.current!);
            listener.current = null;

            setStatus({ kind: 'restoring' });
            try {
                const { data } = await axios.post('/backup/restore', {
                    uri: detail.payload.uri,
                });
                if (data.success) {
                    window.location.href = '/';
                    return;
                }
                setStatus({ kind: 'error', message: data.message });
            } catch (error) {
                setStatus({
                    kind: 'error',
                    message:
                        axios.isAxiosError(error) &&
                        error.response?.data?.message
                            ? error.response.data.message
                            : t('აღდგენა ვერ მოხერხდა'),
                });
            }
        };
        document.addEventListener('native-event', listener.current);

        setStatus({ kind: 'picking' });
        try {
            await axios.post('/backup/pick');
        } catch {
            setStatus({ kind: 'error', message: t('აღდგენა ვერ მოხერხდა') });
        }
    };

    // Open the picker by itself once per launch, straight in Download/PravaEN
    useEffect(() => {
        if (!autoStartRestore) return;
        try {
            if (sessionStorage.getItem('restore.autoOpened')) return;
            sessionStorage.setItem('restore.autoOpened', '1');
        } catch {
            // Storage blocked: open it anyway, just this once per mount.
        }
        void restore();
        // restore only uses stable setters
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStartRestore]);

    const busy = ['saving', 'restoring'].includes(status.kind);
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
                {status.kind === 'restoring' ? (
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
