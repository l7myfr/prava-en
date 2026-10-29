<?php

namespace App\Http\Controllers;

use App\Models\LicenseType;
use App\Models\Question;
use App\Models\QuestionCategory;
use App\Models\UserQuestionProgress;
use App\Support\ProgressBackup;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TopicController extends Controller
{
    /**
     * Share of wrong answers among the answered questions at which a topic is
     * shown as weak.
     */
    private const WEAK_WRONG_SHARE = 0.25;

    public function index(Request $request): Response
    {
        $user = $request->user();
        $licenseType = $user->default_license_type_id
            ? LicenseType::with('children')->find($user->default_license_type_id)
            : null;

        $totals = $this->questionsFor($licenseType)
            ->selectRaw('question_category_id, count(*) as total')
            ->groupBy('question_category_id')
            ->pluck('total', 'question_category_id');

        $progress = UserQuestionProgress::query()
            ->join('questions', 'questions.id', '=', 'user_question_progress.question_id')
            ->where('user_question_progress.user_id', $user->id)
            ->whereIn('questions.id', $this->questionsFor($licenseType)->select('questions.id'))
            ->where(fn (Builder $q) => $q
                ->where('user_question_progress.times_correct', '>', 0)
                ->orWhere('user_question_progress.times_wrong', '>', 0))
            ->selectRaw('
                questions.question_category_id,
                count(*) as answered,
                sum(case when coalesce(user_question_progress.last_answer_correct, user_question_progress.times_correct > user_question_progress.times_wrong) then 1 else 0 end) as correct
            ')
            ->groupBy('questions.question_category_id')
            ->get()
            ->keyBy('question_category_id');

        $topics = QuestionCategory::query()
            ->orderBy('id')
            ->get(['id', 'name'])
            ->filter(fn (QuestionCategory $category) => ($totals[$category->id] ?? 0) > 0)
            ->values()
            ->map(function (QuestionCategory $category) use ($totals, $progress): array {
                $total = (int) $totals[$category->id];
                $answered = (int) ($progress[$category->id]->answered ?? 0);
                $correct = (int) ($progress[$category->id]->correct ?? 0);

                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'total' => $total,
                    'answered' => $answered,
                    'correct' => $correct,
                    'status' => $this->status($total, $answered, $correct),
                ];
            });

        ProgressBackup::saveIfDirty();

        return Inertia::render('topics/index', [
            'topics' => $topics,
            'licenseType' => $licenseType?->only(['id', 'code', 'name']),
        ]);
    }

    /**
     * Clear the answer history of one topic so it can be practised from
     * scratch. Bookmarks and notes are kept.
     */
    public function reset(Request $request, QuestionCategory $questionCategory): RedirectResponse
    {
        UserQuestionProgress::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('question_id', Question::where('question_category_id', $questionCategory->id)->select('id'))
            ->update([
                'times_correct' => 0,
                'times_wrong' => 0,
                'last_answer_correct' => null,
                'last_answer_id' => null,
                'is_learned' => false,
                'first_answered_at' => null,
                'last_answered_at' => null,
            ]);

        ProgressBackup::autoSave();

        return back();
    }

    /**
     * @return Builder<Question>
     */
    private function questionsFor(?LicenseType $licenseType): Builder
    {
        $query = Question::query()->where('is_active', true);

        if ($licenseType) {
            $licenseIds = collect([$licenseType->id]);
            if ($licenseType->is_parent) {
                $licenseIds = $licenseIds->merge($licenseType->children->pluck('id'));
            }
            $query->whereHas('licenseTypes', fn (Builder $q) => $q->whereIn('license_types.id', $licenseIds));
        }

        return $query;
    }

    /**
     * @return 'new'|'weak'|'progress'|'done'
     */
    private function status(int $total, int $answered, int $correct): string
    {
        if ($answered === 0) {
            return 'new';
        }

        if (($answered - $correct) / $answered >= self::WEAK_WRONG_SHARE) {
            return 'weak';
        }

        return $answered >= $total && $correct === $answered ? 'done' : 'progress';
    }
}
