import { Eye, Lock, Repeat } from 'lucide-react';

import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';

/**
 * The two answering switches: whether an answer can be changed, and whether
 * right/wrong shows straight away or only once every question is answered.
 */
export function AnswerSettings({
    allowChange,
    onAllowChange,
    showResults,
    onShowResults,
    changeLocked = false,
    className,
}: {
    allowChange: boolean;
    onAllowChange?: (value: boolean) => void;
    showResults: boolean;
    onShowResults: (value: boolean) => void;
    /** The official mock exam never allows changing an answer. */
    changeLocked?: boolean;
    className?: string;
}) {
    const { t } = useLanguage();

    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-x-4 gap-y-1 text-xs',
                className,
            )}
        >
            <label className="flex items-center gap-1.5">
                {changeLocked ? (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                    <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className={cn(changeLocked && 'text-muted-foreground')}>
                    {t('პასუხის შეცვლა')}
                </span>
                <Switch
                    checked={allowChange && !changeLocked}
                    disabled={changeLocked || !onAllowChange}
                    onCheckedChange={onAllowChange}
                />
            </label>
            <label className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{t('შედეგი მაშინვე')}</span>
                <Switch checked={showResults} onCheckedChange={onShowResults} />
            </label>
        </div>
    );
}
