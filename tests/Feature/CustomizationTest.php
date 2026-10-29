<?php

use App\Models\User;
use Illuminate\Support\Facades\Storage;

test('a profile keeps its background, banner and banner text', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson(route('customization.update'), ['background' => 'ocean'])->assertOk();
    $this->actingAs($user)->postJson(route('customization.update'), ['banner' => 'road', 'banner_text' => 'Pass first try!'])->assertOk();

    expect($user->fresh()->customization)->toMatchArray([
        'background' => 'ocean',
        'banner' => 'road',
        'banner_text' => 'Pass first try!',
    ]);
});

test('unknown designs are rejected', function () {
    $this->actingAs(User::factory()->create())
        ->postJson(route('customization.update'), ['background' => 'rainbow'])
        ->assertUnprocessable();
});

test('a photo becomes the background and replaces the previous one', function () {
    Storage::fake('public');
    $user = User::factory()->create();
    $png = 'data:image/png;base64,'.base64_encode(base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='));

    $this->actingAs($user)->postJson(route('customization.image'), ['type' => 'background', 'image_base64' => $png])->assertOk();
    $first = $user->fresh()->customization['background_image'];
    $this->actingAs($user)->postJson(route('customization.image'), ['type' => 'background', 'image_base64' => $png])->assertOk();

    $user->refresh();
    expect($user->customization['background'])->toBe('photo')
        ->and($user->customization_images['background'])->toContain('storage/customization/');
    Storage::disk('public')->assertMissing($first);
    Storage::disk('public')->assertExists($user->customization['background_image']);
});

test('a non-image is refused as a photo', function () {
    $this->actingAs(User::factory()->create())
        ->postJson(route('customization.image'), ['type' => 'banner', 'image_base64' => 'data:image/png;base64,'.base64_encode('not an image')])
        ->assertUnprocessable();
});
