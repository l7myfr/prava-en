<?php

it('only downloads updates from a GitHub release', function () {
    $this->postJson('/update/download', [
        'url' => 'https://example.com/Prava-EN.apk',
        'version' => '1.8.0',
    ])->assertJsonValidationErrors('url');

    $this->postJson('/update/download', [
        'url' => 'https://github.com/l7myfr/prava-en/releases/download/v1.8.0/Prava-EN.apk',
        'version' => 'latest',
    ])->assertJsonValidationErrors('version');
});

it('reports the update as unavailable off the device, so the app falls back to the browser', function () {
    $this->postJson('/update/download', [
        'url' => 'https://github.com/l7myfr/prava-en/releases/download/v1.8.0/Prava-EN.apk',
        'version' => '1.8.0',
    ])->assertOk()->assertJson(['state' => 'unavailable']);

    $this->getJson('/update/status')->assertOk()->assertJson([
        'state' => 'unavailable',
        'downloaded' => 0,
        'total' => 0,
    ]);

    $this->postJson('/update/install')->assertOk()->assertJson(['result' => 'unavailable']);
});
