<?php

use App\Models\User;

test('guests are redirected to the home page', function () {
    $this->get(route('dashboard'))->assertRedirect('/');
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get(route('dashboard'))->assertOk();
});
test('pages share the app version for the update check', function () {
    config(['nativephp.version' => '1.7.0']);
    $this->actingAs(User::factory()->create());

    $this->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page->where('appVersion', '1.7.0'));
});
