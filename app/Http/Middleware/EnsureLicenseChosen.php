<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sends a profile without a licence to the licence picker first. Without one,
 * topics, practice and the quick exam fall back to every licence's questions,
 * tractor and bus ones included.
 */
class EnsureLicenseChosen
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && ! $request->user()->default_license_type_id) {
            return redirect()->route('onboarding.license');
        }

        return $next($request);
    }
}
