import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';

export function LanguageToggle({ className }: { className?: string }) {
    const { language, setLanguage } = useLanguage();

    return (
        <div
            role="group"
            aria-label="Language"
            className={cn(
                'flex items-center rounded-full border bg-muted/50 p-0.5 text-xs font-semibold',
                className,
            )}
        >
            {(
                [
                    ['en', 'EN'],
                    ['ka', 'ქა'],
                ] as const
            ).map(([code, label]) => (
                <button
                    key={code}
                    type="button"
                    aria-pressed={language === code}
                    onClick={() => setLanguage(code)}
                    className={cn(
                        'min-w-9 rounded-full px-2.5 py-1 transition-colors',
                        language === code
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground',
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
