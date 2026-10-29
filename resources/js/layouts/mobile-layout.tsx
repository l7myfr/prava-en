import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    ClipboardList,
    Home,
    ImageIcon,
    Layers,
    Settings,
} from 'lucide-react';
import {
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { LanguageToggle } from '@/components/language-toggle';
import { SettingsSheet } from '@/components/settings-sheet';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { backIsForPage } from '@/lib/back-layers';
import { goBack } from '@/lib/back-navigation';
import { customizationStyle } from '@/lib/customization';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';

interface MobileLayoutProps {
    children: ReactNode;
    title?: string;
    showBackButton?: boolean;
}

const navItems = [
    { id: 'home', label: 'მთავარი', icon: Home, href: '/dashboard' },
    { id: 'test', label: 'ტესტი', icon: ClipboardList, href: '/test' },
    { id: 'topics', label: 'თემები', icon: Layers, href: '/topics' },
    { id: 'rules', label: 'წესები', icon: BookOpen, href: '/rules' },
    { id: 'signs', label: 'ნიშნები', icon: ImageIcon, href: '/signs' },
];

function getActiveTab(path: string): string {
    if (path.startsWith('/dashboard') || path === '/') return 'home';
    if (path.startsWith('/test/history')) return 'home';
    if (path.startsWith('/test')) return 'test';
    if (path.startsWith('/topics') || path.startsWith('/questions'))
        return 'topics';
    if (path.startsWith('/rules')) return 'rules';
    if (path.startsWith('/signs')) return 'signs';
    return 'home';
}

export default function MobileLayout({
    children,
    title = 'მართვის მოწმობა',
}: MobileLayoutProps) {
    const { t } = useLanguage();

    const { url, props } = usePage<SharedData>();
    const backgroundStyle = customizationStyle(props.auth?.user, 'background');
    const isNative = props.platform === 'native';
    const activeTab = getActiveTab(url);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [showExitToast, setShowExitToast] = useState(false);
    const exitPressedRef = useRef(false);
    const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isOnDashboard = activeTab === 'home';

    // Handle back button for "press again to exit" behavior
    const handleBackButton = useCallback(() => {
        if (!isOnDashboard) {
            // Back to the page the user came from (Home when there is none)
            goBack('/dashboard');
            return;
        }

        // On dashboard - check if this is second press
        if (exitPressedRef.current) {
            // Second press - allow app to close (don't prevent)
            return true;
        }

        // First press on dashboard - show toast
        exitPressedRef.current = true;
        setShowExitToast(true);

        // Clear previous timeout
        if (exitTimeoutRef.current) {
            clearTimeout(exitTimeoutRef.current);
        }

        // Reset after 2 seconds
        exitTimeoutRef.current = setTimeout(() => {
            exitPressedRef.current = false;
            setShowExitToast(false);
        }, 2000);

        return false;
    }, [isOnDashboard]);

    useEffect(() => {
        const handlePopState = (e: PopStateEvent) => {
            // An open sheet, dialog or image viewer takes the press instead
            if (!backIsForPage(e)) return;

            const shouldClose = handleBackButton();
            if (!shouldClose) {
                e.preventDefault();
                window.history.pushState(null, '', window.location.href);
            }
        };

        // Push initial state
        window.history.pushState(null, '', window.location.href);

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (exitTimeoutRef.current) {
                clearTimeout(exitTimeoutRef.current);
            }
        };
    }, [handleBackButton]);

    return (
        <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
            {/* The profile's own background, dimmed so pages stay readable */}
            {backgroundStyle && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10"
                    style={backgroundStyle}
                >
                    <div className="absolute inset-0 bg-background/70" />
                </div>
            )}
            {/* Top Bar - uses safe area inset for status bar */}
            {/* The bars stay full-bleed so they still reach the screen edges,
                but their contents share the same centred column as the page
                body. Without it the browser build spreads a phone layout
                across a 1440px window. */}
            <header className="flex h-[calc(var(--inset-top)+3.5rem)] flex-none items-center border-b bg-background/95 pt-[var(--inset-top)] pr-[calc(var(--inset-right)+1rem)] pl-[calc(var(--inset-left)+1rem)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
                    <h1 className="truncate text-lg font-semibold">
                        {t(title)}
                    </h1>
                    <div className="flex shrink-0 items-center gap-1">
                        <LanguageToggle />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSettingsOpen(true)}
                        >
                            <Settings className="h-5 w-5" />
                            <span className="sr-only">{t('პარამეტრები')}</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Settings Sheet */}
            <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />

            {/* Main Content - scrollable area */}
            <main
                id="main-scroll-container"
                className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
            >
                <div className="mx-auto w-full max-w-3xl">{children}</div>
            </main>

            {/* Bottom Navigation - uses safe area inset */}
            <nav className="flex-none border-t bg-background/95 pb-[var(--inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-around">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;
                        // Home, test and topics show live progress, so never serve them from the prefetch cache
                        const shouldCache =
                            item.id !== 'home' &&
                            item.id !== 'test' &&
                            item.id !== 'topics';

                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                prefetch={shouldCache ? 'mount' : undefined}
                                cacheFor={shouldCache ? '5m' : undefined}
                                className={cn(
                                    'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors',
                                    isActive
                                        ? 'text-primary'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <Icon
                                    className={cn(
                                        'h-5 w-5',
                                        isActive && 'text-primary',
                                    )}
                                />
                                <span className={cn(isActive && 'font-medium')}>
                                    {t(item.label)}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Exit Toast. Android only: a browser tab has no "press back
                again to exit", and the node is in the DOM even when hidden,
                so on the web it would just be read out to screen readers. */}
            {isNative && (
                <div
                    className={cn(
                        'pointer-events-none fixed inset-x-0 z-50 flex justify-center transition-all duration-300',
                        showExitToast
                            ? 'translate-y-0 opacity-100'
                            : 'translate-y-4 opacity-0',
                    )}
                    style={{ bottom: 'calc(5rem + var(--inset-bottom, 0px))' }}
                >
                    <div className="rounded-full bg-foreground/90 px-4 py-2 text-sm text-background shadow-lg">
                        {t('გასასვლელად კიდევ ერთხელ დააჭირეთ უკან')}
                    </div>
                </div>
            )}
        </div>
    );
}
