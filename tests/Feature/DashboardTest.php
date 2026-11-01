<?php

use App\Models\LicenseType;
use App\Models\User;

test('guests are redirected to the home page', function () {
    $this->get(route('dashboard'))->assertRedirect('/');
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs(User::factory()->create(['default_license_type_id' => LicenseType::factory()->create()->id]));

    $this->get(route('dashboard'))->assertOk();
});

test('a profile without a licence picks one before Home', function () {
    $this->actingAs(User::factory()->create(['default_license_type_id' => null]));

    $this->get(route('dashboard'))->assertRedirect(route('onboarding.license'));
});

test('pages share the app version for the update check', function () {
    config(['nativephp.version' => '1.7.0']);
    $this->actingAs(User::factory()->create(['default_license_type_id' => LicenseType::factory()->create()->id]));

    $this->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page->where('appVersion', '1.7.0'));
});
