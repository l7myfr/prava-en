<?php

/**
 * Guards the shape of the native file preview URL.
 *
 * The Android web view classifies a request as a static asset by testing
 * whether the whole URL ends with an image extension, query string included
 * (PHPWebViewClient.isStaticAssetExtension). A camera capture is named
 * `captured_<ms>.jpg`, so `/native-file/preview?path=...captured_123.jpg` was
 * treated as an asset, missed on disk, and re-sent to PHP with its query string
 * appended a second time — which 404s and leaves the avatar unchanged. Gallery
 * picks are named `gallery_selected_<ms>` with no extension, which is the only
 * reason that path kept working and made the bug look camera-specific.
 *
 * Keeping `path` away from the end of the URL is the fix, so assert it stays
 * there. This reads the source because the URL is built in TypeScript.
 */
$callSites = [
    'resources/js/components/settings-sheet.tsx',
    'resources/js/pages/auth/user-selection.tsx',
];

it('never ends the preview URL with the file path', function (string $file) {
    $source = file_get_contents(base_path($file));

    expect($source)->toContain('/native-file/preview?path=');

    preg_match_all('#`/native-file/preview\?path=\$\{[^}]+\}([^`]*)`#', $source, $matches);

    expect($matches[1])->not->toBeEmpty("no preview URL found in {$file}");

    foreach ($matches[1] as $tail) {
        expect($tail)->not->toBe('', "the path parameter is last in {$file}");
    }
})->with($callSites);

it('still resolves a preview when extra query parameters follow the path', function () {
    $image = tempnam(sys_get_temp_dir(), 'preview').'.png';

    $canvas = imagecreatetruecolor(2, 2);
    imagepng($canvas, $image);
    imagedestroy($canvas);

    // resolveImage only trusts on-device locations, so point it at one.
    $allowed = storage_path('app/cache/preview-test.png');
    @mkdir(dirname($allowed), 0755, true);
    copy($image, $allowed);
    unlink($image);

    $this->get('/native-file/preview?path='.urlencode($allowed).'&preview=1')
        ->assertOk()
        ->assertJsonStructure(['dataUrl']);

    unlink($allowed);
});
