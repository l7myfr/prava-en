<?php

use App\Models\LicenseType;
use App\Models\Question;
use App\Models\QuestionCategory;
use App\Models\User;
use App\Models\UserQuestionProgress;

function topicFor(User $user, LicenseType $license, int $questions): QuestionCategory
{
    $category = QuestionCategory::factory()->create();
    Question::factory()->count($questions)->create(['question_category_id' => $category->id])
        ->each(fn (Question $q) => $q->licenseTypes()->attach($license->id));

    return $category;
}

function topicOf($page, int $id): ?array
{
    return collect($page->toArray()['props']['topics'])->firstWhere('id', $id);
}

test('guests are redirected from topics', function () {
    $this->get(route('topics.index'))->assertRedirect('/');
});

test('topics list counts and colours progress per topic for the user licence', function () {
    $license = LicenseType::factory()->create();
    $user = User::factory()->create(['default_license_type_id' => $license->id]);

    $fresh = topicFor($user, $license, 3);
    $weak = topicFor($user, $license, 4);
    $done = topicFor($user, $license, 2);
    $otherLicence = QuestionCategory::factory()->create();
    Question::factory()->create(['question_category_id' => $otherLicence->id])
        ->licenseTypes()->attach(LicenseType::factory()->create()->id);

    foreach ($weak->questions()->take(2)->get() as $q) {
        UserQuestionProgress::create(['user_id' => $user->id, 'question_id' => $q->id, 'times_wrong' => 1]);
    }
    foreach ($done->questions as $q) {
        UserQuestionProgress::create(['user_id' => $user->id, 'question_id' => $q->id, 'times_correct' => 2]);
    }

    $this->actingAs($user)
        ->get(route('topics.index'))
        ->assertOk()
        ->assertInertia(function ($page) use ($fresh, $weak, $done, $otherLicence) {
            $page->component('topics/index');

            expect(topicOf($page, $fresh->id))->toMatchArray(['total' => 3, 'answered' => 0, 'status' => 'new'])
                ->and(topicOf($page, $weak->id))->toMatchArray(['total' => 4, 'answered' => 2, 'correct' => 0, 'status' => 'weak'])
                ->and(topicOf($page, $done->id))->toMatchArray(['total' => 2, 'answered' => 2, 'correct' => 2, 'status' => 'done'])
                ->and(topicOf($page, $otherLicence->id))->toBeNull();
        });
});

test('resetting a topic clears its answers but keeps bookmarks', function () {
    $license = LicenseType::factory()->create();
    $user = User::factory()->create(['default_license_type_id' => $license->id]);
    $topic = topicFor($user, $license, 1);
    $other = topicFor($user, $license, 1);

    $progress = UserQuestionProgress::create([
        'user_id' => $user->id,
        'question_id' => $topic->questions()->first()->id,
        'times_correct' => 3,
        'times_wrong' => 1,
        'is_bookmarked' => true,
    ]);
    $untouched = UserQuestionProgress::create([
        'user_id' => $user->id,
        'question_id' => $other->questions()->first()->id,
        'times_correct' => 1,
    ]);

    $this->actingAs($user)->post(route('topics.reset', $topic))->assertRedirect();

    expect($progress->fresh())->times_correct->toBe(0)->times_wrong->toBe(0)->is_bookmarked->toBeTrue()
        ->and($untouched->fresh()->times_correct)->toBe(1);
});

test('rules pages render and reject unknown chapters', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('rules.index'))->assertOk()->assertInertia(fn ($page) => $page->component('rules/index'));
    $this->get(route('rules.show', '12'))->assertOk()
        ->assertInertia(fn ($page) => $page->component('rules/show')->where('chapter', '12'));
    $this->get('/rules/../etc')->assertNotFound();
});

test('test setup counts topic questions per licence, not across all licences', function () {
    $car = LicenseType::factory()->create();
    $truck = LicenseType::factory()->create();
    $user = User::factory()->create(['default_license_type_id' => $car->id]);
    $topic = topicFor($user, $car, 2);
    Question::factory()->count(5)->create(['question_category_id' => $topic->id])
        ->each(fn (Question $q) => $q->licenseTypes()->attach($truck->id));

    $this->actingAs($user)
        ->get(route('test.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where("categoryCountsByLicense.{$car->id}.{$topic->id}", 2)
            ->where("categoryCountsByLicense.{$truck->id}.{$topic->id}", 5)
        );
});

test('a topic counts a question by its latest answer, so a corrected mistake counts as correct', function () {
    $license = LicenseType::factory()->create();
    $user = User::factory()->create(['default_license_type_id' => $license->id]);
    $topic = topicFor($user, $license, 1);
    $question = $topic->questions()->first();
    $wrong = $question->answers()->create(['text' => 'no', 'is_correct' => false, 'position' => 1]);
    $right = $question->answers()->create(['text' => 'yes', 'is_correct' => true, 'position' => 2]);

    $this->actingAs($user);
    $this->postJson(route('questions.answer', $question), ['answer_id' => $wrong->id])->assertOk();
    $this->get(route('topics.index'))->assertInertia(fn ($page) => expect(topicOf($page, $topic->id))
        ->toMatchArray(['answered' => 1, 'correct' => 0]));

    $this->postJson(route('questions.answer', $question), ['answer_id' => $right->id])->assertOk();
    $this->get(route('topics.index'))->assertInertia(fn ($page) => expect(topicOf($page, $topic->id))
        ->toMatchArray(['answered' => 1, 'correct' => 1, 'status' => 'done']));
});

test('resuming a topic opens the page with the first unanswered question and shows past answers', function () {
    $license = LicenseType::factory()->create();
    $user = User::factory()->create(['default_license_type_id' => $license->id]);
    $topic = topicFor($user, $license, 25);
    $questions = $topic->questions()->orderBy('id')->get();

    foreach ($questions->take(22) as $question) {
        $answer = $question->answers()->create(['text' => 'a', 'is_correct' => true, 'position' => 1]);
        UserQuestionProgress::create([
            'user_id' => $user->id,
            'question_id' => $question->id,
            'times_correct' => 1,
            'last_answer_correct' => true,
            'last_answer_id' => $answer->id,
        ]);
    }

    $this->actingAs($user)
        ->get('/questions?resume=1&per_page=20&categories='.$topic->id.'&license_type='.$license->id)
        ->assertInertia(fn ($page) => $page
            ->where('questions.current_page', 2)
            ->where('resumeQuestionId', $questions[22]->id)
            ->where("userProgress.{$questions[20]->id}.last_answer_id", fn ($id) => $id !== null)
        );
});

test('practice answers can be changed and the topic follows the latest one', function () {
    $license = LicenseType::factory()->create();
    $user = User::factory()->create(['default_license_type_id' => $license->id]);
    $topic = topicFor($user, $license, 1);
    $question = $topic->questions()->first();
    $right = $question->answers()->create(['text' => 'yes', 'is_correct' => true, 'position' => 1]);
    $wrong = $question->answers()->create(['text' => 'no', 'is_correct' => false, 'position' => 2]);

    $this->actingAs($user);
    $this->postJson(route('questions.answer', $question), ['answer_id' => $right->id])->assertOk();
    $this->postJson(route('questions.answer', $question), ['answer_id' => $wrong->id])->assertOk();

    expect(UserQuestionProgress::where('user_id', $user->id)->first())
        ->last_answer_id->toBe($wrong->id)
        ->last_answer_correct->toBeFalse();
});
