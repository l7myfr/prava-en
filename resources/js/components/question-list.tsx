import type { Question } from '@/components/question-card';
import { QuestionCard } from '@/components/question-card';
import { useLanguage } from '@/hooks/use-language';
import type { AnswerState } from '@/lib/test-utils';

interface QuestionListProps {
    questions: Question[];
    answerStates: Record<number, AnswerState>;
    shuffleSeed?: number;
    emptyMessage?: string;
}

export function QuestionList({
    questions,
    answerStates,
    shuffleSeed = 0,
    emptyMessage = 'კითხვები არ არის',
}: QuestionListProps) {
    const { t } = useLanguage();
    if (questions.length === 0) {
        return (
            <p className="py-8 text-center text-muted-foreground">
                {t(emptyMessage)}
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {questions.map((question, index) => (
                <QuestionCard
                    key={question.id}
                    question={question}
                    questionNumber={index + 1}
                    shuffleSeed={shuffleSeed}
                    answerState={answerStates[question.id]}
                    isBookmarked={false}
                    isSubmitting={false}
                    onAnswer={() => {}}
                    onBookmark={() => {}}
                    onInfoClick={() => {}}
                    testMode={true}
                />
            ))}
        </div>
    );
}
