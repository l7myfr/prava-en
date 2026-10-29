import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';

interface TestResultStatsProps {
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
}

export function TestResultStats({
    correctCount,
    wrongCount,
    unansweredCount,
}: TestResultStatsProps) {
    const { t } = useLanguage();

    return (
        <div className="grid grid-cols-3 gap-2">
            <Card>
                <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {correctCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {t('სწორი')}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">
                        {wrongCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {t('არასწორი')}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                        {unansweredCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {t('უპასუხო')}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
