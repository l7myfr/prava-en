<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Device only: download a newer release APK in the background and hand it to
 * Android's installer (UpdateFunctions.kt), so updating needs no browser.
 */
class UpdateController extends Controller
{
    public const HOSTS = ['github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com'];

    public function download(Request $request): JsonResponse
    {
        $request->validate([
            'url' => ['required', 'url:https', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! in_array(parse_url((string) $value, PHP_URL_HOST), self::HOSTS, true)) {
                    $fail('The update must come from a GitHub release.');
                }
            }],
            'version' => ['required', 'regex:/^\d+\.\d+\.\d+$/'],
        ]);

        return response()->json(self::status(self::call('Update.Download', [
            'url' => $request->string('url')->toString(),
            'version' => $request->string('version')->toString(),
        ])));
    }

    public function show(): JsonResponse
    {
        return response()->json(self::status(self::call('Update.Status', [])));
    }

    public function install(): JsonResponse
    {
        $result = self::call('Update.Install', []);

        return response()->json(['result' => $result['result'] ?? 'unavailable']);
    }

    /**
     * @param  array<string, mixed>  $result
     * @return array{state: string, version: string, downloaded: int, total: int, error: string}
     */
    private static function status(array $result): array
    {
        return [
            'state' => $result['state'] ?? 'unavailable',
            'version' => (string) ($result['version'] ?? ''),
            'downloaded' => (int) ($result['downloaded'] ?? 0),
            'total' => (int) ($result['total'] ?? 0),
            'error' => (string) ($result['error'] ?? ''),
        ];
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
