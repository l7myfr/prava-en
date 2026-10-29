<?php

use App\Models\LicenseType;
use App\Models\User;

test('the category can be changed over JSON, including from none', function () {
    $user = User::factory()->create(['default_license_type_id' => null]);
    $license = LicenseType::factory()->create();

    $this->actingAs($user)
        ->postJson(route('profile.license'), ['default_license_type_id' => $license->id])
        ->assertOk()
        ->assertJson(['default_license_type_id' => $license->id]);

    expect($user->fresh()->default_license_type_id)->toBe($license->id);
});

test('a profile without a password can be deleted with a POST', function () {
    $user = User::factory()->create(['password' => null, 'has_password' => false]);

    $this->actingAs($user)->postJson(route('profile.destroy.post'))->assertOk()->assertJson(['success' => true]);

    expect(User::find($user->id))->toBeNull();
});

test('a profile with a password needs it to be deleted with a POST', function () {
    $user = User::factory()->create(['password' => 'secret-pass', 'has_password' => true]);

    $this->actingAs($user)->postJson(route('profile.destroy.post'), ['password' => 'wrong'])->assertUnprocessable();
    expect(User::find($user->id))->not->toBeNull();

    $this->actingAs($user)->postJson(route('profile.destroy.post'), ['password' => 'secret-pass'])->assertOk();
    expect(User::find($user->id))->toBeNull();
});
