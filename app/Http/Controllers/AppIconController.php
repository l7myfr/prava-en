<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Device only: switch the launcher icon between the designs built into the
 * app, or pin a home-screen shortcut showing the user's own photo (Android
 * cannot use an arbitrary picture as the app icon itself).
 */
class AppIconController extends Controller
{
    public const ICONS = ['default', 'wheel', 'road', 'sign', 'car'];

    public function show(): JsonResponse
    {
        $result = self::call('AppIcon.Get', []);

        return response()->json(['icon' => $result['icon'] ?? 'default']);
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate(['icon' => ['required', Rule::in(self::ICONS)]]);

        $result = self::call('AppIcon.Set', ['icon' => $request->string('icon')->toString()]);

        return response()->json(['success' => (bool) ($result['success'] ?? false)]);
    }

    public function photo(Request $request): JsonResponse
    {
        $request->validate([
            'path' => ['required', 'string'],
            'label' => ['nullable', 'string', 'max:30'],
        ]);

        $result = self::call('AppIcon.PinPhoto', [
            'path' => $request->string('path')->toString(),
            'label' => $request->input('label') ?: config('app.name'),
        ]);

        return response()->json([
            'success' => (bool) ($result['success'] ?? false),
            'reason' => $result['reason'] ?? null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private static function call(string $method, array $payload): array
    {
        if (! env('NATIVEPHP_RUNNING') || ! function_exists('nativephp_call')) {
            return [];
        }

        $result = json_decode((string) nativephp_call($method, json_encode($payload)), true);

        return is_array($result) ? $result : [];
    }
}
