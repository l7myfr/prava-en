import { usePage } from '@inertiajs/react';
import axios from 'axios';
import { Download, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';
import { useOpenExternal } from '@/hooks/use-open-external';
import { type SharedData } from '@/types';

const latestReleaseUrl =
    'https://api.github.com/repos/l7myfr/prava-en/releases/latest';
const apkName = 'Prava-EN.apk';
const checkedKey = 'update.latest';
const laterKey = 'update.later';

interface Release {
    version: string;
    url: string;
}

interface DownloadStatus {
    state: 'idle' | 'downloading' | 'done' | 'failed' | 'unavailable';
    version: string;
    downloaded: number;
    total: number;
    error: string;
}

const parseVersion = (version: string) =>
    /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version)?.slice(1).map(Number) ?? null;

const isNewer = (candidate: string, current: string) => {
    const next = parseVersion(candidate);
    const now = parseVersion(current);
    if (!next || !now) return false;

    const index = next.findIndex((part, i) => part !== now[i]);
    return index >= 0 && next[index] > now[index];
};

const readSession = (key: string) => {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
};

const writeSession = (key: string, value: string) => {
    try {
        sessionStorage.setItem(key, value);
    } catch {
        // Storage blocked: the check just runs again next time.
    }
};

/** Asks GitHub once per app session for the newest published release. */
async function latestRelease(): Promise<Release | null> {
    const cached = readSession(checkedKey);
    if (cached) return JSON.parse(cached) as Release | null;

    const response = await fetch(latestReleaseUrl, {
        headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
        tag_name: string;
        assets: { name: string; browser_download_url: string }[];
    };
    const apk = data.assets.find((asset) => asset.name === apkName);
    const release = apk
        ? {
              version: data.tag_name.replace(/^v/, ''),
              url: apk.browser_download_url,
          }
        : null;

    writeSession(checkedKey, JSON.stringify(release));
    return release;
}

/**
 * Asks to update when GitHub has a newer release, downloads it in the
 * background with a progress bar on Home, then opens Android's installer.
 */
export function UpdatePrompt() {
    const { t } = useLanguage();
    const { platform, appVersion } = usePage<SharedData>().props;
    const openExternal = useOpenExternal();
    const [release, setRelease] = useState<Release | null>(null);
    const [asking, setAsking] = useState(false);
    const [status, setStatus] = useState<DownloadStatus | null>(null);
    const [needsPermission, setNeedsPermission] = useState(false);
    const installedFor = useRef<string | null>(null);

    useEffect(() => {
        if (platform !== 'native' || !parseVersion(appVersion)) return;

        let cancelled = false;
        (async () => {
            // A download started earlier keeps running when Home is left
            const { data: current } =
                await axios.get<DownloadStatus>('/update/status');
            const resuming =
                (current.state === 'downloading' || current.state === 'done') &&
                isNewer(current.version, appVersion);
            if (!cancelled && resuming) setStatus(current);

            const latest = await latestRelease();
            if (cancelled || !latest || !isNewer(latest.version, appVersion)) {
                return;
            }
            setRelease(latest);
            if (!resuming && readSession(laterKey) !== latest.version) {
                setAsking(true);
            }
        })().catch(() => {
            // Offline or rate limited: try again next session.
        });

        return () => {
            cancelled = true;
        };
    }, [platform, appVersion]);

    const install = useCallback(async () => {
        const { data } = await axios.post<{ result: string }>(
            '/update/install',
        );
        setNeedsPermission(data.result === 'needs_permission');
    }, []);

    // Opens the installer by itself once, as soon as the download finishes
    const installWhenDone = useCallback(
        (current: DownloadStatus) => {
            if (
                current.state !== 'done' ||
                installedFor.current === current.version
            ) {
                return;
            }
            installedFor.current = current.version;
            install().catch(() => {});
        },
        [install],
    );

    const downloading = status?.state === 'downloading';

    useEffect(() => {
        if (!downloading) return;

        const timer = setInterval(async () => {
            try {
                const { data } =
                    await axios.get<DownloadStatus>('/update/status');
                setStatus(data);
                installWhenDone(data);
            } catch {
                // Next tick tries again.
            }
        }, 500);

        return () => clearInterval(timer);
    }, [downloading, installWhenDone]);

    const start = async () => {
        if (!release) return;
        setAsking(false);
        setNeedsPermission(false);
        try {
            const { data } = await axios.post<DownloadStatus>(
                '/update/download',
                { url: release.url, version: release.version },
            );
            if (data.state === 'unavailable') {
                openExternal(release.url);
                return;
            }
            setStatus(data);
            installWhenDone(data);
        } catch {
            openExternal(release.url);
        }
    };

    const later = () => {
        if (release) writeSession(laterKey, release.version);
        setAsking(false);
    };

    const percent =
        status && status.total > 0
            ? Math.min(
                  100,
                  Math.round((status.downloaded / status.total) * 100),
              )
            : null;
    const megabytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

    return (
        <>
            <AlertDialog open={asking} onOpenChange={setAsking}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('ხელმისაწვდომია განახლება')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            v{appVersion} → v{release?.version}.{' '}
                            {t(
                                'ჩამოიტვირთება ფონურად, შემდეგ Android შემოგთავაზებს დაყენებას.',
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={later}>
                            {t('მოგვიანებით')}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={start}>
                            {t('განახლება')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {status && status.state !== 'idle' ? (
                <Card className="border-primary/40 bg-primary/5">
                    <CardContent className="space-y-3 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">
                                {status.state === 'downloading'
                                    ? t('განახლება იტვირთება')
                                    : status.state === 'done'
                                      ? t('განახლება მზადაა')
                                      : t('ჩამოტვირთვა ვერ მოხერხდა')}{' '}
                                <span className="text-muted-foreground">
                                    v{status.version || release?.version}
                                </span>
                            </p>
                            {status.state === 'downloading' && (
                                <span className="text-sm font-medium tabular-nums">
                                    {percent !== null
                                        ? `${percent}%`
                                        : `${megabytes(status.downloaded)} MB`}
                                </span>
                            )}
                            {status.state === 'done' && (
                                <Button size="sm" onClick={() => install()}>
                                    {t('დაყენება')}
                                </Button>
                            )}
                            {status.state === 'failed' && (
                                <Button size="sm" onClick={start}>
                                    <RotateCw className="h-4 w-4" />
                                    {t('ხელახლა ცდა')}
                                </Button>
                            )}
                        </div>

                        {status.state === 'downloading' && (
                            <div className="h-2 overflow-hidden rounded-full bg-primary/15">
                                <div
                                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                                    style={{ width: `${percent ?? 5}%` }}
                                />
                            </div>
                        )}

                        {status.state === 'done' && needsPermission && (
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'დაუშვი Prava EN-ისთვის აპების დაყენება და დააჭირე „დაყენებას“.',
                                )}
                            </p>
                        )}

                        {status.state === 'failed' && release && (
                            <button
                                type="button"
                                onClick={() => openExternal(release.url)}
                                className="text-xs text-muted-foreground underline"
                            >
                                {t('ბრაუზერში გახსნა')}
                            </button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                release &&
                !asking && (
                    <Card className="border-primary/40 bg-primary/5">
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15">
                                <Download className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">
                                    {t('ხელმისაწვდომია განახლება')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    v{appVersion} → v{release.version}
                                </p>
                            </div>
                            <Button size="sm" onClick={start}>
                                {t('განახლება')}
                            </Button>
                        </CardContent>
                    </Card>
                )
            )}
        </>
    );
}
