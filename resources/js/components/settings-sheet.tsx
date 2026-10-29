import { Transition } from '@headlessui/react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeft,
    Camera,
    Check,
    ChevronRight,
    ExternalLink,
    ImagePlus,
    LogOut,
    Monitor,
    Moon,
    ShieldCheck,
    Star,
    Sun,
    Trash2,
    User,
} from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

// NativePHP imports for camera access
import {
    Events,
    IsMobile,
    Camera as NativeCamera,
    Off,
    On,
    SecureStorage,
} from '#nativephp';
import { BackupActions } from '@/components/backup-actions';
import { CustomizationSettings } from '@/components/customization-settings';
import { type Appearance, useAppearance } from '@/hooks/use-appearance';
import {
    type Accent,
    accents,
    type TextSize,
    textSizes,
    useCustomization,
} from '@/hooks/use-customization';
import { useLanguage } from '@/hooks/use-language';
import { useOpenExternal } from '@/hooks/use-open-external';
import { getGalleryTarget, setGalleryTarget } from '@/lib/gallery-target';
import { cn } from '@/lib/utils';
import { logout } from '@/routes/auth';
import { type LicenseType, type SharedData } from '@/types';

import InputError from './input-error';
import { getLicenseTypeIcon } from './license-type-select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';

interface SettingsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type SettingsView = 'main' | 'profile';

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;
    const [currentView, setCurrentView] = useState<SettingsView>('main');
    const historyDepthRef = useRef(0);
    const currentViewRef = useRef<SettingsView>('main');

    // Keep ref in sync with state
    useEffect(() => {
        currentViewRef.current = currentView;
    }, [currentView]);

    // Track open state in ref for Inertia event handler
    const openRef = useRef(open);
    useEffect(() => {
        openRef.current = open;
    }, [open]);

    // Handle Android back button - only depend on `open`
    useEffect(() => {
        if (!open) {
            historyDepthRef.current = 0;
            return;
        }

        // Push initial state when sheet opens
        window.history.pushState({ settingsSheet: true, view: 'main' }, '');
        historyDepthRef.current = 1;

        // Use Inertia's router events to intercept navigation BEFORE it happens
        const removeBeforeListener = router.on('before', (event) => {
            if (openRef.current) {
                // Only block navigation to a DIFFERENT page, not same-page updates
                const targetUrl = new URL(event.detail.visit.url);
                const currentPath = window.location.pathname;

                // Allow navigation to the same page (e.g., saving settings)
                if (targetUrl.pathname === currentPath) {
                    return;
                }

                // Cancel navigation to different pages and handle like a back button press
                event.preventDefault();
                if (historyDepthRef.current > 0) {
                    historyDepthRef.current--;
                    if (currentViewRef.current !== 'main') {
                        setCurrentView('main');
                    } else {
                        onOpenChange(false);
                    }
                }
                return false;
            }
        });

        // Also handle browser back button via popstate for non-Inertia navigation
        const handlePopState = () => {
            if (historyDepthRef.current <= 0) {
                return;
            }

            historyDepthRef.current--;

            if (currentViewRef.current !== 'main') {
                setCurrentView('main');
            } else {
                onOpenChange(false);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            removeBeforeListener();
            window.removeEventListener('popstate', handlePopState);
        };
    }, [open, onOpenChange]);

    // Navigate to a view and push history state
    const navigateToView = (view: SettingsView) => {
        if (view !== 'main') {
            window.history.pushState({ settingsSheet: true, view }, '');
            historyDepthRef.current++;
        }
        setCurrentView(view);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setTimeout(() => {
                setCurrentView('main');
            }, 300);
        }
        onOpenChange(newOpen);
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent
                side="right"
                className="flex w-full flex-col p-0"
                hideClose={currentView !== 'main'}
            >
                {currentView === 'main' && (
                    <MainView
                        user={user}
                        onNavigate={navigateToView}
                        onClose={() => onOpenChange(false)}
                    />
                )}
                {currentView === 'profile' && (
                    <ProfileView
                        user={user}
                        onBack={() => window.history.back()}
                        onClose={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}

// Theme toggle component
function ThemeToggle() {
    const { appearance, updateAppearance } = useAppearance();

    const themes: { value: Appearance; icon: typeof Sun }[] = [
        { value: 'light', icon: Sun },
        { value: 'dark', icon: Moon },
        { value: 'system', icon: Monitor },
    ];

    return (
        <div className="flex gap-2">
            {themes.map(({ value, icon: Icon }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => updateAppearance(value)}
                    className={cn(
                        'flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all',
                        appearance === value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                    )}
                >
                    <Icon className="h-5 w-5" />
                </button>
            ))}
        </div>
    );
}

const accentSwatches: Record<Accent, string> = {
    default: 'oklch(0.45 0 0)',
    blue: 'oklch(0.546 0.245 262.881)',
    green: 'oklch(0.527 0.154 150.069)',
    teal: 'oklch(0.511 0.096 186.391)',
    purple: 'oklch(0.541 0.281 293.009)',
    orange: 'oklch(0.553 0.195 38.402)',
    rose: 'oklch(0.586 0.253 17.585)',
};

function AccentPicker() {
    const { t } = useLanguage();
    const { accent, setAccent } = useCustomization();

    return (
        <div className="flex flex-wrap gap-2.5">
            {accents.map((value) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => setAccent(value)}
                    aria-pressed={accent === value}
                    className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-all',
                        accent === value && 'ring-2 ring-foreground',
                    )}
                    style={{ backgroundColor: accentSwatches[value] }}
                >
                    {accent === value && (
                        <Check className="h-4 w-4 text-white" />
                    )}
                    <span className="sr-only">
                        {t(value === 'default' ? 'ნაგულისხმევი' : value)}
                    </span>
                </button>
            ))}
        </div>
    );
}

const textSizeLabels: Record<TextSize, string> = {
    small: 'text-xs',
    normal: 'text-sm',
    large: 'text-base',
    xlarge: 'text-lg',
};

function TextSizePicker() {
    const { textSize, setTextSize } = useCustomization();

    return (
        <div className="flex gap-2">
            {textSizes.map((value) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => setTextSize(value)}
                    className={cn(
                        'flex h-11 flex-1 items-center justify-center rounded-xl font-semibold transition-all',
                        textSizeLabels[value],
                        textSize === value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                    )}
                >
                    Aa
                </button>
            ))}
        </div>
    );
}

// License type selector for settings
function LicenseTypeSelector({
    licenseTypes,
    selectedId,
    userName,
}: {
    licenseTypes: LicenseType[];
    selectedId: number | null | undefined;
    userName: string;
}) {
    const { t } = useLanguage();

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSelect = (id: number) => {
        if (id === selectedId) return;

        setSaving(true);
        setSaved(false);

        router.post(
            '/settings/profile',
            {
                name: userName,
                default_license_type_id: id,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSaving(false);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                },
                onError: () => {
                    setSaving(false);
                },
            },
        );
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">
                    {t('კატეგორია')}
                </h4>
                {saving && (
                    <span className="text-xs text-muted-foreground">
                        {t('ინახება...')}
                    </span>
                )}
                {saved && (
                    <span className="text-xs text-green-600">
                        {t('შენახულია')}
                    </span>
                )}
            </div>
            <div className="grid grid-cols-4 gap-2">
                {licenseTypes.map((lt) => {
                    const isSelected = lt.id === selectedId;
                    const childCodes =
                        lt.children && lt.children.length > 0
                            ? lt.children.map((c) => c.code).join(', ')
                            : null;

                    return (
                        <button
                            key={lt.id}
                            type="button"
                            onClick={() => handleSelect(lt.id)}
                            disabled={saving}
                            className={cn(
                                'relative flex flex-col items-center justify-center gap-1 rounded-xl p-3 transition-all',
                                isSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                                saving && 'opacity-50',
                            )}
                        >
                            {getLicenseTypeIcon(
                                lt.code,
                                cn(
                                    'h-5 w-5',
                                    isSelected && 'text-primary-foreground',
                                ),
                            )}
                            <span className="text-xs font-medium">
                                {lt.code}
                            </span>
                            {childCodes && (
                                <span className="text-[10px] opacity-70">
                                    {childCodes}
                                </span>
                            )}
                            {isSelected && (
                                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                                    <Check className="h-3 w-3 text-white" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Main settings menu
function MainView({
    user,
    onNavigate,
}: {
    user: SharedData['auth']['user'];
    onNavigate: (view: SettingsView) => void;
    onClose: () => void;
}) {
    const { t } = useLanguage();

    const { licenseTypes, platform } = usePage<SharedData>().props;
    const openExternal = useOpenExternal();

    const handleLogout = () => {
        window.location.href = logout.url();
    };

    /**
     * Rate the app, preferring the native Play overlay and falling back to the
     * store listing. Also retires the one-shot prompt on the results screen,
     * since the user has answered the question by coming here.
     */
    const handleRateApp = async () => {
        try {
            const { data } = await axios.post('/review-prompt/rate');

            if (!data?.native) {
                openExternal(data?.store_url);
            }
        } catch {
            openExternal(
                'https://play.google.com/store/apps/details?id=com.prava.trongio',
            );
        }
    };

    return (
        <div className="flex h-full flex-col">
            <SheetHeader className="flex-row items-center gap-3 border-b px-4 pb-4 pl-14">
                <SheetTitle className="text-xl">{t('პარამეტრები')}</SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
                {/* User profile card */}
                <button
                    type="button"
                    onClick={() => onNavigate('profile')}
                    className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/50"
                >
                    <Avatar className="h-14 w-14">
                        {user.profile_image_url ? (
                            <AvatarImage
                                src={user.profile_image_url}
                                alt={user.name}
                            />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-lg text-primary">
                            {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-medium">
                            {user.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {t('პროფილის რედაქტირება')}
                        </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>

                {/* License type selector */}
                <div className="border-t px-4 py-4">
                    <LicenseTypeSelector
                        licenseTypes={licenseTypes}
                        selectedId={user.default_license_type_id}
                        userName={user.name}
                    />
                </div>

                {/* Appearance: mode, accent colour and text size */}
                <div className="space-y-4 border-t px-4 py-4">
                    <div>
                        <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                            {t('თემა')}
                        </h4>
                        <ThemeToggle />
                    </div>
                    <div>
                        <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                            {t('ფერი')}
                        </h4>
                        <AccentPicker />
                    </div>
                    <div>
                        <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                            {t('ტექსტის ზომა')}
                        </h4>
                        <TextSizePicker />
                    </div>
                    <CustomizationSettings />
                </div>
            </div>

            {/* Guests keep their history only until the session goes stale,
                so give them a standing way out of that. */}
            {user.is_guest && (
                <Link
                    href="/guest/upgrade"
                    className="flex w-full items-center gap-3 border-t px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50"
                >
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <div className="min-w-0 flex-1 text-left">
                        <span>{t('შედეგების შენახვა')}</span>
                        <p className="text-xs text-muted-foreground">
                            {t('შექმენი ანგარიში')}
                        </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
            )}

            {platform === 'native' && <BackupActions className="border-t" />}

            {/* Rate the app. Always available on the device, unlike the
                one-shot prompt on the results screen, so anyone who dismissed
                that can still rate. There is no store listing on the web. */}
            {platform === 'native' && (
                <button
                    type="button"
                    onClick={handleRateApp}
                    className="flex w-full items-center gap-3 border-t px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50"
                >
                    <Star className="h-5 w-5 text-amber-500" />
                    <div className="min-w-0 flex-1 text-left">
                        <span>{t('შეფასება')}</span>
                        <p className="text-xs text-muted-foreground">
                            Google Play
                        </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </button>
            )}

            {/* GitHub contribute link */}
            <button
                type="button"
                onClick={() =>
                    openExternal('https://github.com/trongio/Prava-App')
                }
                className="flex w-full items-center gap-3 border-t px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50"
            >
                <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <div className="min-w-0 flex-1 text-left">
                    <span>trongio</span>
                    <p className="text-xs text-muted-foreground">
                        {t('კონტრიბუცია')}
                    </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Privacy Policy link */}
            <button
                type="button"
                onClick={() =>
                    openExternal(
                        'https://raw.githubusercontent.com/trongio/Prava-App/refs/heads/main/PRIVACY_POLICY.md',
                    )
                }
                className="flex w-full items-center gap-3 border-t px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50"
            >
                <ShieldCheck className="h-5 w-5" />
                <div className="min-w-0 flex-1 text-left">
                    <span>{t('კონფიდენციალურობა')}</span>
                    <p className="text-xs text-muted-foreground">
                        {t('პოლიტიკა')}
                    </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Logout button */}
            <div className="border-t p-4">
                <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={handleLogout}
                >
                    <LogOut className="h-5 w-5" />
                    {t('გასვლა')}
                </Button>
            </div>
        </div>
    );
}

// Profile editing view with password and delete
function ProfileView({
    user,
    onBack,
    onClose,
}: {
    user: SharedData['auth']['user'];
    onBack: () => void;
    onClose: () => void;
}) {
    const { t } = useLanguage();

    const fileInputRef = useRef<HTMLInputElement>(null);
    // Always hold the latest name so the native camera/gallery listeners (which
    // capture this render's closure) don't post a stale name and revert a rename.
    const userNameRef = useRef(user.name);
    useEffect(() => {
        userNameRef.current = user.name;
    }, [user.name]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
    const [showFinalDialog, setShowFinalDialog] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [nativeImagePath, setNativeImagePath] = useState<string | null>(null);
    const [imageSaved, setImageSaved] = useState(false);
    const [savingImage, setSavingImage] = useState(false);

    const profileForm = useForm({
        name: user.name,
        profile_image: null as File | null,
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const deleteForm = useForm({
        password: '',
    });

    // Auto-save image to server using API (same pattern as registration)
    const saveImage = async (file: File | null, base64Data: string | null) => {
        setSavingImage(true);
        setImageSaved(false);

        try {
            const isNative = await IsMobile();
            console.log('Settings: saveImage - isNative:', isNative);

            if (isNative && base64Data) {
                // Use API with Sanctum token (like registration does)
                console.log('Settings: Saving via API with token...');
                const { value: token } = await SecureStorage.get('auth_token');
                console.log('Settings: Got token:', token ? 'yes' : 'no');

                const response = await fetch('/api/profile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        name: userNameRef.current,
                        profile_image_base64: base64Data,
                    }),
                });

                const data = await response.json();
                console.log('Settings: API response:', response.status, data);

                if (response.ok && data.success) {
                    console.log('Settings: Image saved successfully via API');
                    setSavingImage(false);
                    setImageSaved(true);
                    setTimeout(() => setImageSaved(false), 3000);
                } else {
                    console.error('Settings: API save error:', data);
                    setSavingImage(false);
                }
            } else {
                // Web: Use Inertia router (works with session auth)
                console.log('Settings: Saving via Inertia router...');
                if (base64Data) {
                    router.post(
                        '/settings/profile',
                        {
                            name: userNameRef.current,
                            profile_image_base64: base64Data,
                        },
                        {
                            preserveScroll: true,
                            preserveState: true,
                            onSuccess: () => {
                                console.log(
                                    'Settings: Image saved successfully via Inertia',
                                );
                                setSavingImage(false);
                                setImageSaved(true);
                                setTimeout(() => setImageSaved(false), 3000);
                            },
                            onError: (errors) => {
                                console.error(
                                    'Settings: Inertia save error:',
                                    errors,
                                );
                                setSavingImage(false);
                            },
                        },
                    );
                } else if (file) {
                    const formData = new FormData();
                    formData.append('name', userNameRef.current);
                    formData.append('profile_image', file);

                    router.post('/settings/profile', formData, {
                        preserveScroll: true,
                        preserveState: true,
                        onSuccess: () => {
                            console.log(
                                'Settings: File saved successfully via Inertia',
                            );
                            setSavingImage(false);
                            setImageSaved(true);
                            setTimeout(() => setImageSaved(false), 3000);
                        },
                        onError: (errors) => {
                            console.error(
                                'Settings: Inertia file save error:',
                                errors,
                            );
                            setSavingImage(false);
                        },
                    });
                }
            }
        } catch (error) {
            console.error('Settings: saveImage error:', error);
            setSavingImage(false);
        }
    };

    // Convert native file to base64 data URL for preview (GET to avoid NativePHP POST interception).
    // Declared as an effect event because it is only ever called from the
    // camera/gallery listeners below, which are registered once on mount: this
    // keeps them calling the current version (current form and save handler)
    // without dragging a per-render function into the listener effect's deps.
    const loadNativeFilePreview = useEffectEvent(async (path: string) => {
        try {
            console.log('Settings: Loading preview for:', path);
            // The trailing parameter is load-bearing, not decoration. The
            // Android web view decides whether a request is a static asset by
            // testing whether the WHOLE url ends with an image extension,
            // query string included (PHPWebViewClient.isStaticAssetExtension).
            // A camera capture is `captured_<ms>.jpg`, so `?path=...jpg` was
            // misread as an asset, missed on disk, and then re-sent to PHP with
            // its query string appended a second time, which 404s. A gallery
            // pick is `gallery_selected_<ms>` with no extension, which is the
            // only reason that path ever worked. Keep `path` away from the end.
            const url = `/native-file/preview?path=${encodeURIComponent(path)}&preview=1`;
            const response = await fetch(url);

            const data = await response.json();
            console.log(
                'Settings: Preview response received, dataUrl length:',
                data.dataUrl?.length,
            );

            if (data.dataUrl) {
                console.log(
                    'Settings: Setting base64 preview and nativeImagePath',
                );
                setNativeImagePath(path);
                setPreviewUrl(data.dataUrl);
                console.log('Settings: previewUrl state updated');
                profileForm.setData('profile_image', null);
                // Auto-save the native image using base64 data
                saveImage(null, data.dataUrl);
            } else {
                console.error('Settings: Preview failed:', data.error);
            }
        } catch (error) {
            console.error(
                'Settings: Failed to load native file preview:',
                error,
            );
        }
    });

    // Handle native camera photo capture
    const handleTakePhoto = async () => {
        console.log('Settings: handleTakePhoto called');
        setShowImagePicker(false);
        setGalleryTarget('profile');
        try {
            console.log('Settings: Calling NativeCamera.getPhoto()...');
            await NativeCamera.getPhoto().id('settings-photo');
            console.log('Settings: NativeCamera.getPhoto() completed');
        } catch (error) {
            console.error('Settings: NativeCamera.getPhoto() error:', error);
        }
    };

    // Handle native gallery picker
    const handlePickFromGallery = async () => {
        console.log('Settings: handlePickFromGallery called');
        setShowImagePicker(false);
        setGalleryTarget('profile');
        try {
            console.log('Settings: Calling NativeCamera.pickImages()...');
            await NativeCamera.pickImages().images().id('settings-gallery');
            console.log('Settings: NativeCamera.pickImages() completed');
        } catch (error) {
            console.error('Settings: NativeCamera.pickImages() error:', error);
        }
    };

    // Handle click on avatar - show native picker or file input
    const handleAvatarClick = async () => {
        console.log('Settings: handleAvatarClick called');
        try {
            const isNative = await IsMobile();
            console.log('Settings: IsMobile() returned:', isNative);

            if (isNative) {
                console.log('Settings: Showing native image picker');
                setShowImagePicker(true);
            } else {
                console.log('Settings: Falling back to file input');
                fileInputRef.current?.click();
            }
        } catch (error) {
            console.error('Settings: IsMobile() error:', error);
            // Fallback to file input on error
            fileInputRef.current?.click();
        }
    };

    // Set up NativePHP event listeners for camera and gallery
    useEffect(() => {
        const handlePhotoTaken = (payload: {
            path: string;
            mimeType: string;
            id: string;
        }) => {
            console.log('PhotoTaken event (settings):', payload);
            if (getGalleryTarget() !== 'profile') return;
            if (payload.path && payload.id?.startsWith('settings-')) {
                loadNativeFilePreview(payload.path);
            }
        };

        const handleMediaSelected = (payload: {
            success: boolean;
            files: Array<{
                path: string;
                mimeType: string;
                extension: string;
                type: string;
            }>;
            count: number;
        }) => {
            console.log('MediaSelected event (settings):', payload);
            if (getGalleryTarget() !== 'profile') return;
            if (payload.success && payload.files && payload.files.length > 0) {
                loadNativeFilePreview(payload.files[0].path);
            }
        };

        // Use Events object if available, fallback to string names
        console.log('Settings: Registering NativePHP event listeners...');
        console.log('Events.Camera.PhotoTaken:', Events?.Camera?.PhotoTaken);
        console.log(
            'Events.Gallery.MediaSelected:',
            Events?.Gallery?.MediaSelected,
        );

        const photoEvent =
            Events?.Camera?.PhotoTaken ||
            'Native\\Mobile\\Events\\Camera\\PhotoTaken';
        const mediaEvent =
            Events?.Gallery?.MediaSelected ||
            'Native\\Mobile\\Events\\Gallery\\MediaSelected';

        On(photoEvent, handlePhotoTaken);
        On(mediaEvent, handleMediaSelected);

        return () => {
            Off(photoEvent, handlePhotoTaken);
            Off(mediaEvent, handleMediaSelected);
        };
    }, []);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            profileForm.setData('profile_image', file);
            setNativeImagePath(null);
            setPreviewUrl(URL.createObjectURL(file));
            // Auto-save the image
            saveImage(file, null);
        }
    };

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // If we have a native image (indicated by nativeImagePath), send base64 data
        if (nativeImagePath && previewUrl) {
            router.post('/settings/profile', {
                name: profileForm.data.name,
                profile_image_base64: previewUrl,
            });
        } else if (profileForm.data.profile_image) {
            profileForm.post('/settings/profile', {
                forceFormData: true,
                preserveScroll: true,
            });
        } else {
            profileForm.post('/settings/profile', {
                preserveScroll: true,
            });
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        passwordForm.put('/settings/password', {
            preserveScroll: true,
            onSuccess: () => {
                passwordForm.reset();
                setShowPasswordForm(false);
            },
            onError: () => {
                passwordForm.reset('password', 'password_confirmation');
            },
        });
    };

    const handleDeleteConfirm = () => {
        if (deleteStep === 0) {
            setDeleteStep(1);
        } else if (deleteStep === 1) {
            setDeleteStep(2);
            setShowFinalDialog(true);
        }
    };

    const handleFinalDelete = () => {
        const hasPassword = user.has_password || user.password !== null;
        if (hasPassword) {
            deleteForm.delete('/settings/profile', {
                onSuccess: () => {
                    setShowFinalDialog(false);
                    onClose();
                },
            });
        } else {
            router.delete('/settings/profile', {
                onSuccess: () => {
                    setShowFinalDialog(false);
                    onClose();
                },
            });
        }
    };

    const displayImage = previewUrl || user.profile_image_url;
    const hasPassword = user.has_password ?? false;

    // Debug: log the display image source
    console.log(
        'Settings: Render - previewUrl:',
        previewUrl ? 'set (base64)' : null,
        'user.profile_image_url:',
        user.profile_image_url,
        'displayImage:',
        displayImage ? 'has value' : 'null',
    );

    return (
        <div className="flex h-full flex-col">
            <SheetHeader className="flex-row items-center gap-3 border-b px-4 pb-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <SheetTitle className="text-xl">{t('პროფილი')}</SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
                {/* Profile form */}
                <form onSubmit={handleProfileSubmit} className="p-4">
                    {/* Avatar upload */}
                    <div className="mb-6 flex flex-col items-center">
                        <div className="relative">
                            <Avatar className="h-24 w-24">
                                {displayImage ? (
                                    <AvatarImage
                                        src={displayImage}
                                        alt={profileForm.data.name}
                                    />
                                ) : null}
                                <AvatarFallback className="bg-primary/10 text-2xl text-primary">
                                    {profileForm.data.name
                                        .slice(0, 2)
                                        .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                type="button"
                                onClick={handleAvatarClick}
                                className="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm"
                            >
                                <Camera className="h-4 w-4" />
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                        />
                        <p
                            className={cn(
                                'mt-2 text-sm',
                                imageSaved
                                    ? 'text-green-600'
                                    : savingImage
                                      ? 'text-muted-foreground'
                                      : 'text-muted-foreground',
                            )}
                        >
                            {savingImage
                                ? t('იტვირთება...')
                                : imageSaved
                                  ? t('ფოტო შენახულია')
                                  : t('შეეხეთ ფოტოს შესაცვლელად')}
                        </p>

                        {/* Native Image Picker Modal */}
                        {showImagePicker && (
                            <div
                                className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-4"
                                onClick={() => setShowImagePicker(false)}
                            >
                                <div
                                    className="w-full max-w-sm space-y-2 rounded-t-xl bg-background p-4 pb-8"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <p className="mb-4 text-center text-sm text-muted-foreground">
                                        {t('აირჩიეთ ფოტოს წყარო')}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start gap-3"
                                        onClick={handleTakePhoto}
                                    >
                                        <Camera className="h-5 w-5" />
                                        {t('გადაიღეთ ფოტო')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start gap-3"
                                        onClick={handlePickFromGallery}
                                    >
                                        <ImagePlus className="h-5 w-5" />
                                        {t('აირჩიეთ გალერიიდან')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="mt-2 w-full"
                                        onClick={() =>
                                            setShowImagePicker(false)
                                        }
                                    >
                                        {t('გაუქმება')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Name field */}
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('სახელი')}</Label>
                        <Input
                            id="name"
                            value={profileForm.data.name}
                            onChange={(e) =>
                                profileForm.setData('name', e.target.value)
                            }
                            placeholder={t('თქვენი სახელი')}
                        />
                        <InputError message={profileForm.errors.name} />
                    </div>

                    {/* Save button */}
                    <Button
                        type="submit"
                        className="mt-4 w-full"
                        disabled={profileForm.processing}
                    >
                        {profileForm.processing
                            ? t('იტვირთება...')
                            : t('შენახვა')}
                    </Button>
                    <Transition
                        show={profileForm.recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="mt-2 text-center text-sm text-green-600">
                            {t('შენახულია')}
                        </p>
                    </Transition>
                </form>

                {/* Password section */}
                <div className="border-t px-4 py-4">
                    <button
                        type="button"
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                        className="flex w-full items-center justify-between rounded-lg bg-muted/50 p-3 text-left"
                    >
                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">
                                {hasPassword
                                    ? t('პაროლის შეცვლა')
                                    : t('პაროლის დამატება')}
                            </span>
                        </div>
                        <ChevronRight
                            className={cn(
                                'h-5 w-5 text-muted-foreground transition-transform',
                                showPasswordForm && 'rotate-90',
                            )}
                        />
                    </button>

                    {showPasswordForm && (
                        <form
                            onSubmit={handlePasswordSubmit}
                            className="mt-4 space-y-4"
                        >
                            {hasPassword && (
                                <div className="space-y-2">
                                    <Label htmlFor="current_password">
                                        {t('მიმდინარე პაროლი')}
                                    </Label>
                                    <Input
                                        id="current_password"
                                        type="password"
                                        value={
                                            passwordForm.data.current_password
                                        }
                                        onChange={(e) =>
                                            passwordForm.setData(
                                                'current_password',
                                                e.target.value,
                                            )
                                        }
                                        autoComplete="current-password"
                                    />
                                    <InputError
                                        message={
                                            passwordForm.errors.current_password
                                        }
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password">
                                    {hasPassword
                                        ? t('ახალი პაროლი')
                                        : t('პაროლი')}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={passwordForm.data.password}
                                    onChange={(e) =>
                                        passwordForm.setData(
                                            'password',
                                            e.target.value,
                                        )
                                    }
                                    autoComplete="new-password"
                                />
                                <InputError
                                    message={passwordForm.errors.password}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation">
                                    {t('დაადასტურეთ პაროლი')}
                                </Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={
                                        passwordForm.data.password_confirmation
                                    }
                                    onChange={(e) =>
                                        passwordForm.setData(
                                            'password_confirmation',
                                            e.target.value,
                                        )
                                    }
                                    autoComplete="new-password"
                                />
                                <InputError
                                    message={
                                        passwordForm.errors
                                            .password_confirmation
                                    }
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={passwordForm.processing}
                            >
                                {passwordForm.processing
                                    ? t('იტვირთება...')
                                    : hasPassword
                                      ? t('პაროლის შეცვლა')
                                      : t('პაროლის დამატება')}
                            </Button>
                        </form>
                    )}
                </div>

                {/* Delete account section */}
                <div className="border-t px-4 py-4">
                    <h4 className="mb-3 text-sm font-medium text-destructive">
                        {t('საშიში ზონა')}
                    </h4>

                    {deleteStep === 0 ? (
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-3 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={handleDeleteConfirm}
                        >
                            <Trash2 className="h-5 w-5" />
                            {t('ანგარიშის წაშლა')}
                        </Button>
                    ) : (
                        <div className="space-y-3 rounded-lg bg-destructive/10 p-4">
                            <p className="text-sm text-destructive">
                                {deleteStep === 1
                                    ? t(
                                          'ნამდვილად გსურთ ანგარიშის წაშლა? ეს მოქმედება შეუქცევადია.',
                                      )
                                    : t(
                                          'ბოლო გაფრთხილება! თქვენი ყველა მონაცემი სამუდამოდ წაიშლება.',
                                      )}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setDeleteStep(0)}
                                >
                                    {t('გაუქმება')}
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1"
                                    onClick={handleDeleteConfirm}
                                >
                                    {deleteStep === 1
                                        ? t('დიახ, წაშლა')
                                        : t('წაშლა სამუდამოდ')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Final confirmation dialog */}
            <Dialog open={showFinalDialog} onOpenChange={setShowFinalDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">
                            {t('საბოლოო დადასტურება')}
                        </DialogTitle>
                        <DialogDescription>
                            {hasPassword
                                ? t('შეიყვანეთ პაროლი ანგარიშის წასაშლელად')
                                : t('დააჭირეთ ღილაკს ანგარიშის წასაშლელად')}
                        </DialogDescription>
                    </DialogHeader>

                    {hasPassword && (
                        <div className="space-y-2">
                            <Label htmlFor="delete_password">
                                {t('პაროლი')}
                            </Label>
                            <Input
                                id="delete_password"
                                type="password"
                                value={deleteForm.data.password}
                                onChange={(e) =>
                                    deleteForm.setData(
                                        'password',
                                        e.target.value,
                                    )
                                }
                                autoComplete="current-password"
                            />
                            <InputError message={deleteForm.errors.password} />
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowFinalDialog(false);
                                setDeleteStep(0);
                            }}
                        >
                            {t('გაუქმება')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleFinalDelete}
                            disabled={deleteForm.processing}
                        >
                            {deleteForm.processing
                                ? t('იშლება...')
                                : t('წაშლა')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
