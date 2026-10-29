<?php

use App\Models\LicenseType;
use App\Models\Question;
use App\Models\User;
use App\Models\UserQuestionProgress;
use App\Support\ProgressBackup;

test('a backup restores every profile and its progress after the database is emptied', function () {
    $license = LicenseType::factory()->create();
    $user = User::factory()->create(['name' => 'Learner', 'default_license_type_id' => $license->id]);
    $question = Question::factory()->create();
    UserQuestionProgress::create([
        'user_id' => $user->id,
        'question_id' => $question->id,
        'times_correct' => 2,
        'last_answer_correct' => true,
        'is_bookmarked' => true,
    ]);

    $backup = json_decode(json_encode(ProgressBackup::export()), true);

    UserQuestionProgress::query()->delete();
    User::query()->delete();

    expect(ProgressBackup::restore($backup))->toBe(1);

    $restored = User::first();
    expect($restored->name)->toBe('Learner')
        ->and($restored->default_license_type_id)->toBe($license->id)
        ->and(UserQuestionProgress::where('user_id', $restored->id)->first())
        ->times_correct->toBe(2)
        ->is_bookmarked->toBeTrue();
});

test('restoring refuses a file that is not a backup and keeps the data', function () {
    User::factory()->create();

    expect(fn () => ProgressBackup::restore(['hello' => 'world']))->toThrow(RuntimeException::class)
        ->and(User::count())->toBe(1);
});

test('the backup routes only exist on the device build', function () {
    config(['app.platform' => 'web']);

    $this->postJson('/backup/save')->assertNotFound();
});

test('automatic backups can be switched off and back on', function () {
    expect(ProgressBackup::autoEnabled())->toBeTrue();

    ProgressBackup::setAutoEnabled(false);
    expect(ProgressBackup::autoEnabled())->toBeFalse();

    ProgressBackup::setAutoEnabled(true);
    expect(ProgressBackup::autoEnabled())->toBeTrue();
});
