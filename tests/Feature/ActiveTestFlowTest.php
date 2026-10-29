<?php

use App\Models\Answer;
use App\Models\LicenseType;
use App\Models\Question;
use App\Models\QuestionCategory;
use App\Models\TestResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create a user
    $this->user = User::factory()->create();

    // Create a question category
    $this->category = QuestionCategory::factory()->create();

    // Create questions with answers
    $this->questions = collect();
    for ($i = 0; $i < 3; $i++) {
        $question = Question::factory()->create([
            'question_category_id' => $this->category->id,
        ]);

        // Create 4 answers for each question (1 correct, 3 wrong)
        Answer::factory()->correct()->create([
            'question_id' => $question->id,
            'position' => 1,
        ]);
        for ($j = 2; $j <= 4; $j++) {
            Answer::factory()->create([
                'question_id' => $question->id,
                'position' => $j,
            ]);
        }

        $question->load(['answers', 'questionCategory']);
        $this->questions->push($question);
    }

    // Build questions_with_answers array as stored in TestResult
    $questionsWithAnswers = $this->questions->map(function ($q) {
        return [
            'id' => $q->id,
            'question' => $q->question,
            'description' => $q->description,
            'full_description' => $q->full_description,
            'image' => $q->image,
            'image_custom' => $q->image_custom,
            'is_short_image' => $q->is_short_image,
            'answers' => $q->answers->map(fn ($a) => [
                'id' => $a->id,
                'text' => $a->text,
                'is_correct' => $a->is_correct,
                'position' => $a->position,
            ])->toArray(),
            'question_category' => [
                'id' => $q->questionCategory->id,
                'name' => $q->questionCategory->name,
            ],
            'signs' => [],
        ];
    })->toArray();

    // Create an active test
    $this->testResult = TestResult::create([
        'user_id' => $this->user->id,
        'test_type' => 'quick',
        'configuration' => [
            'question_count' => 3,
            'time_per_question' => 60,
            'failure_threshold' => 10,
            'shuffle_seed' => 0.5,
        ],
        'questions_with_answers' => $questionsWithAnswers,
        'total_questions' => 3,
        'correct_count' => 0,
        'wrong_count' => 0,
        'score_percentage' => 0,
        'status' => TestResult::STATUS_IN_PROGRESS,
        'started_at' => now(),
        'current_question_index' => 0,
        'answers_given' => [],
        'skipped_question_ids' => [],
        'remaining_time_seconds' => 180,
    ]);
});

describe('Test Answer Submission', function () {
    it('allows answering a question correctly', function () {
        $question = $this->questions->first();
        $correctAnswer = $question->answers->firstWhere('is_correct', true);

        $response = $this->actingAs($this->user)
            ->postJson("/test/{$this->testResult->id}/answer", [
                'question_id' => $question->id,
                'answer_id' => $correctAnswer->id,
                'remaining_time' => 170,
            ]);

        $response->assertSuccessful()
            ->assertJson([
                'is_correct' => true,
                'correct_count' => 1,
                'wrong_count' => 0,
                'has_exceeded_mistakes' => false,
            ]);

        $this->testResult->refresh();
        expect($this->testResult->correct_count)->toBe(1);
        expect($this->testResult->wrong_count)->toBe(0);
        expect($this->testResult->answers_given)->toHaveKey((string) $question->id);
    });

    it('allows answering a question incorrectly', function () {
        $question = $this->questions->first();
        $wrongAnswer = $question->answers->firstWhere('is_correct', false);

        $response = $this->actingAs($this->user)
            ->postJson("/test/{$this->testResult->id}/answer", [
                'question_id' => $question->id,
                'answer_id' => $wrongAnswer->id,
                'remaining_time' => 170,
            ]);

        $response->assertSuccessful()
            ->assertJson([
                'is_correct' => false,
                'correct_count' => 0,
                'wrong_count' => 1,
            ]);

        $this->testResult->refresh();
        expect($this->testResult->wrong_count)->toBe(1);
    });

    it('prevents answering the same question twice', function () {
        $question = $this->questions->first();
        $correctAnswer = $question->answers->firstWhere('is_correct', true);

        // Answer once
        $this->actingAs($this->user)
            ->postJson("/test/{$this->testResult->id}/answer", [
                'question_id' => $question->id,
                'answer_id' => $correctAnswer->id,
                'remaining_time' => 170,
            ]);

        // Try to answer again
        $response = $this->actingAs($this->user)
            ->postJson("/test/{$this->testResult->id}/answer", [
                'question_id' => $question->id,
                'answer_id' => $correctAnswer->id,
                'remaining_time' => 160,
            ]);

        $response->assertStatus(400)
            ->assertJson(['error' => 'Question already answered']);
    });

    it('prevents other users from answering', function () {
        $otherUser = User::factory()->create();
        $question = $this->questions->first();
        $correctAnswer = $question->answers->firstWhere('is_correct', true);

        $response = $this->actingAs($otherUser)
            ->postJson("/test/{$this->testResult->id}/answer", [
                'question_id' => $question->id,
                'answer_id' => $correctAnswer->id,
                'remaining_time' => 170,
            ]);

        $response->assertStatus(403);
    });
});

describe('Test Skip Functionality', function () {
    it('allows skipping a question', function () {
        $question = $this->questions->first();

        $response = $this->actingAs($this->user)
            ->postJson("/test/{$this->testResult->id}/skip", [
                'question_id' => $question->id,
            ]);

        $response->assertSuccessful()
            ->assertJson(['success' => true]);

        $this->testResult->refresh();
        expect($this->testResult->skipped_question_ids)->toContain($question->id);
    });

    it('prevents skipping an already answered question', function () {
        $question = $this->questions->first();
        $correctAnswer = $question->answers->firstWhere('is_correct', true);

        // Answer first
        $this->actingAs($this->user)
            ->postJson("/test/{$this->testResult->id}/answer", [
                'question_id' => $question->id,
                'answer_id' => $correctAnswer->id,
                'remaining_time' => 170,
            ]);

        // Try to skip
        $response = $this->actingAs($this->user)
            ->postJson("/test/{$this->testResult->id}/skip", [
                'question_id' => $question->id,
            ]);

        $response->assertStatus(400)
            ->assertJson(['error' => 'Question already answered']);
    });

    it('removes question from skipped list when answered', function () {
        $question = $this->questions->first();
        $correctAnswer = $question->answers->firstWhere('is_correct', true);

        // Skip first
        $this->actingAs($this->user)
            ->postJson("/test/{$this->testResult->id}/skip", [
                'question_id' => $question->id,
            ]);

        $this->testResult->refresh();
        expect($this->testResult->skipped_question_ids)->toContain($question->id);

        // Then answer
        $this->actingAs($this->user)
            ->postJson("/test/{$this->testResult->id}/answer", [
                'question_id' => $question->id,
                'answer_id' => $correctAnswer->id,
                'remaining_time' => 160,
            ]);

        $this->testResult->refresh();
        expect($this->testResult->skipped_question_ids)->not->toContain($question->id);
    });
});

describe('Test Pause Functionality', function () {
    it('allows pausing a test', function () {
        $response = $this->actingAs($this->user)
            ->postJson("/test/{$this->testResult->id}/pause", [
                'current_question_index' => 1,
                'remaining_time' => 150,
            ]);

        $response->assertSuccessful()
            ->assertJson(['success' => true]);

        $this->testResult->refresh();
        expect($this->testResult->status)->toBe(TestResult::STATUS_PAUSED);
        expect($this->testResult->current_question_index)->toBe(1);
        expect($this->testResult->remaining_time_seconds)->toBe(150);
    });
});

describe('Test Complete Functionality', function () {
    it('completes a test and returns JSON for AJAX requests', function () {
        // Answer all questions first
        foreach ($this->questions as $question) {
            $correctAnswer = $question->answers->firstWhere('is_correct', true);
            $this->actingAs($this->user)
                ->postJson("/test/{$this->testResult->id}/answer", [
                    'question_id' => $question->id,
                    'answer_id' => $correctAnswer->id,
                    'remaining_time' => 100,
                ]);
        }

        $response = $this->actingAs($this->user)
            ->postJson("/test/{$this->testResult->id}/complete", [
                'remaining_time' => 100,
            ]);

        $response->assertSuccessful()
            ->assertJson([
                'success' => true,
                'passed' => true,
            ])
            ->assertJsonStructure(['redirect_url']);

        $this->testResult->refresh();
        expect($this->testResult->status)->toBe(TestResult::STATUS_PASSED);
        expect($this->testResult->finished_at)->not->toBeNull();
    });

    it('marks test as failed when exceeding allowed mistakes', function () {
        // Answer all questions wrong
        foreach ($this->questions as $question) {
            $wrongAnswer = $question->answers->firstWhere('is_correct', false);
            $this->actingAs($this->user)
                ->postJson("/test/{$this->testResult->id}/answer", [
                    'question_id' => $question->id,
                    'answer_id' => $wrongAnswer->id,
                    'remaining_time' => 100,
                ]);
        }

        $response = $this->actingAs($this->user)
            ->postJson("/test/{$this->testResult->id}/complete", [
                'remaining_time' => 100,
            ]);

        $response->assertSuccessful()
            ->assertJson([
                'success' => true,
                'passed' => false,
            ]);

        $this->testResult->refresh();
        expect($this->testResult->status)->toBe(TestResult::STATUS_FAILED);
    });

    it('returns redirect for non-AJAX requests', function () {
        $response = $this->actingAs($this->user)
            ->post("/test/{$this->testResult->id}/complete", [
                'remaining_time' => 100,
            ]);

        $response->assertRedirect();
    });

    it('prevents completing an already completed test', function () {
        $this->testResult->update(['status' => TestResult::STATUS_PASSED]);

        $response = $this->actingAs($this->user)
            ->postJson("/test/{$this->testResult->id}/complete", [
                'remaining_time' => 100,
            ]);

        $response->assertSuccessful()
            ->assertJson(['success' => true]);
    });
});

describe('Test Results Page', function () {
    it('shows results for completed test', function () {
        $this->testResult->update([
            'status' => TestResult::STATUS_PASSED,
            'finished_at' => now(),
            'score_percentage' => 100,
            'time_taken_seconds' => 60,
        ]);

        $response = $this->actingAs($this->user)
            ->get("/test/{$this->testResult->id}/results");

        $response->assertSuccessful();
    });

    it('redirects to active test if not completed', function () {
        $response = $this->actingAs($this->user)
            ->get("/test/{$this->testResult->id}/results");

        $response->assertRedirect();
    });
});

describe('Changing answers', function () {
    it('refuses a second answer when the test does not allow changes', function () {
        $question = $this->questions->first();
        [$first, $second] = [$question->answers[0], $question->answers[1]];

        $this->actingAs($this->user)->postJson("/test/{$this->testResult->id}/answer", [
            'question_id' => $question->id, 'answer_id' => $first->id, 'remaining_time' => 170,
        ])->assertOk();

        $this->actingAs($this->user)->postJson("/test/{$this->testResult->id}/answer", [
            'question_id' => $question->id, 'answer_id' => $second->id, 'remaining_time' => 160,
        ])->assertStatus(400);
    });

    it('moves the score when an allowed answer change flips the result', function () {
        $this->testResult->update(['configuration' => [...$this->testResult->configuration, 'allow_answer_change' => true]]);
        $question = $this->questions->first();
        $correct = $question->answers->firstWhere('is_correct', true);
        $wrong = $question->answers->firstWhere('is_correct', false);

        $this->actingAs($this->user)->postJson("/test/{$this->testResult->id}/answer", [
            'question_id' => $question->id, 'answer_id' => $wrong->id, 'remaining_time' => 170,
        ])->assertJson(['correct_count' => 0, 'wrong_count' => 1]);

        $this->actingAs($this->user)->postJson("/test/{$this->testResult->id}/answer", [
            'question_id' => $question->id, 'answer_id' => $correct->id, 'remaining_time' => 160,
        ])->assertJson(['correct_count' => 1, 'wrong_count' => 0]);

        expect($this->testResult->fresh()->answers_given[$question->id]['answer_id'])->toBe($correct->id);
    });

    it('never lets the official mock exam allow answer changes', function () {
        $this->user->update(['default_license_type_id' => LicenseType::factory()->create(['code' => 'B'])->id]);
        $this->testResult->update(['status' => TestResult::STATUS_PASSED, 'finished_at' => now()]);

        $this->actingAs($this->user)->post('/test/quick', ['allow_answer_change' => true]);

        $quick = TestResult::where('user_id', $this->user->id)->latest('id')->first();
        expect($quick->configuration['allow_answer_change'] ?? false)->toBeFalse();
    });
});

describe('Showing results', function () {
    it('stores whether a self-made test shows right/wrong straight away', function () {
        $this->testResult->update(['status' => TestResult::STATUS_PASSED, 'finished_at' => now()]);

        $this->actingAs($this->user)->post('/test', [
            'test_type' => 'thematic',
            'question_count' => 2,
            'time_per_question' => 60,
            'failure_threshold' => 10,
            'category_ids' => [$this->category->id],
            'show_results' => false,
        ]);

        $test = TestResult::where('user_id', $this->user->id)->latest('id')->first();
        expect($test->configuration['show_results'])->toBeFalse();
    });
});

describe('Rules during a test', function () {
    it('stores whether a self-made test lets you open the rules', function () {
        $this->testResult->update(['status' => TestResult::STATUS_PASSED, 'finished_at' => now()]);

        $this->actingAs($this->user)->post('/test', [
            'test_type' => 'thematic',
            'question_count' => 2,
            'time_per_question' => 60,
            'failure_threshold' => 10,
            'category_ids' => [$this->category->id],
            'allow_rules' => true,
        ]);

        $test = TestResult::where('user_id', $this->user->id)->latest('id')->first();
        expect($test->configuration['allow_rules'])->toBeTrue()
            ->and($test->configuration['official_exam'])->toBeFalse();
    });

    it('never lets the official mock exam open the rules', function () {
        $license = LicenseType::factory()->create(['code' => 'B']);
        $this->questions->each(fn ($question) => $question->licenseTypes()->attach($license->id));
        $this->user->update(['default_license_type_id' => $license->id]);
        $this->testResult->update(['status' => TestResult::STATUS_PASSED, 'finished_at' => now()]);

        $this->actingAs($this->user)->post('/test/quick', ['allow_rules' => true]);

        $quick = TestResult::where('user_id', $this->user->id)->latest('id')->first();
        expect($quick->configuration['official_exam'])->toBeTrue()
            ->and($quick->configuration['allow_rules'])->toBeFalse();
    });

    it('keeps a new similar test as open-book or exam as the one before', function () {
        $this->testResult->update([
            'test_type' => 'thematic',
            'status' => TestResult::STATUS_PASSED,
            'finished_at' => now(),
            'configuration' => [
                ...$this->testResult->configuration,
                'category_ids' => [$this->category->id],
                'allow_rules' => true,
                'allow_answer_change' => true,
                'official_exam' => false,
            ],
        ]);

        $this->actingAs($this->user)->post("/test/{$this->testResult->id}/new-similar");

        $similar = TestResult::where('user_id', $this->user->id)->latest('id')->first();
        expect($similar->id)->not->toBe($this->testResult->id)
            ->and($similar->configuration['allow_rules'])->toBeTrue()
            ->and($similar->configuration['allow_answer_change'])->toBeTrue();
    });
});
