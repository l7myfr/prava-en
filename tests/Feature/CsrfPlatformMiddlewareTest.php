<?php

use App\Http\Middleware\ValidateCsrfTokenUnlessNative;
use App\Support\Platform;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;

/**
 * The device build only skips CSRF if the swap in bootstrap/app.php actually
 * lands in the web group.
 *
 * It did not for a long time: `$middleware->replace()` rewrites the *global*
 * stack only, and ValidateCsrfToken lives in the web group, which Laravel
 * rewrites from a separate map fed by `replaceInGroup()`. Nothing errored, the
 * stock middleware simply stayed, and the device answered POSTs with 419
 * whenever the WebView's token went stale. Assert on the resolved group rather
 * than on a request, because Laravel skips CSRF while running tests, so a
 * request-level test passes either way and proves nothing.
 */
it('swaps the stock CSRF middleware in the web group', function () {
    $groups = (function () {
        $kernel = app(Kernel::class);
        $property = (new ReflectionClass($kernel))->getProperty('middlewareGroups');
        $property->setAccessible(true);

        return $property->getValue($kernel);
    })();

    expect($groups['web'])
        ->toContain(ValidateCsrfTokenUnlessNative::class)
        ->not->toContain(ValidateCsrfToken::class);
});

it('keeps enforcing CSRF on the web build', function () {
    config(['app.platform' => 'web']);

    expect(Platform::isWeb())->toBeTrue();

    // The subclass only short-circuits for the device build; on web it must
    // fall through to Laravel's own verification.
    $middleware = new ReflectionClass(ValidateCsrfTokenUnlessNative::class);

    expect($middleware->getParentClass()->getName())->toBe(ValidateCsrfToken::class);
});
