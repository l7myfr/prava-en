import { usePage } from '@inertiajs/react';
import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';
import { useOpenExternal } from '@/hooks/use-open-external';
import { type SharedData } from '@/types';

const latestReleaseUrl =
    'https://api.github.com/repos/l7myfr/prava-en/releases/latest';
const apkName = 'Prava-EN.apk';
const checkedKey = 'update.latest';
const dismissedKey = 'update.dismissed';

interface Release {
    version: string;
    url: string;
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

const readStorage = (storage: Storage, key: string) => {
    try {
        return storage.getItem(key);
    } catch {
        return null;
    }
};

const writeStorage = (storage: Storage, key: string, value: string) => {
    try {
        storage.setItem(key, value);
    } catch {
        // Storage blocked: the check just runs again next time.
    }
};

/** Asks GitHub once per app session for the newest published release. */
async function latestRelease(): Promise<Release | null> {
    const cached = readStorage(sessionStorage, checkedKey);
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

    writeStorage(sessionStorage, checkedKey, JSON.stringify(release));
    return release;
}

/** Offers the newer APK from GitHub releases when there is one. */
export function UpdateCard() {
    const { t } = useLanguage();
    const { platform, appVersion } = usePage<SharedData>().props;
    const openExternal = useOpenExternal();
    const [release, setRelease] = useState<Release | null>(null);

    useEffect(() => {
        if (platform !== 'native' || !parseVersion(appVersion)) return;

        let cancelled = false;
        latestRelease()
            .then((latest) => {
                if (
                    !cancelled &&
                    latest &&
                    isNewer(latest.version, appVersion) &&
                    readStorage(localStorage, dismissedKey) !== latest.version
                ) {
                    setRelease(latest);
                }
            })
            .catch(() => {
                // Offline or rate limited: try again next session.
            });

        return () => {
            cancelled = true;
        };
    }, [platform, appVersion]);

    if (!release) return null;

    const dismiss = () => {
        writeStorage(localStorage, dismissedKey, release.version);
        setRelease(null);
    };

    return (
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
                <Button size="sm" onClick={() => openExternal(release.url)}>
                    {t('ჩამოტვირთვა')}
                </Button>
                <button
                    type="button"
                    onClick={dismiss}
                    className="-mr-1 rounded-full p-1 text-muted-foreground"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">{t('დახურვა')}</span>
                </button>
            </CardContent>
        </Card>
    );
}
