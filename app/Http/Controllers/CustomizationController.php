<?php

namespace App\Http\Controllers;

use App\Support\NativeMediaFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * The profile's look: a page background and a banner on Home, each either a
 * built-in design or the user's own photo, plus a line of banner text.
 */
class CustomizationController extends Controller
{
    /**
     * Built-in designs; the frontend holds how each one looks.
     *
     * @var array<string, list<string>>
     */
    public const PRESETS = [
        'background' => ['none', 'sunset', 'ocean', 'forest', 'night', 'signs', 'photo'],
        'banner' => ['none', 'road', 'city', 'mountains', 'sunset', 'photo'],
    ];

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'background' => ['sometimes', Rule::in(self::PRESETS['background'])],
            'banner' => ['sometimes', Rule::in(self::PRESETS['banner'])],
            'banner_text' => ['sometimes', 'nullable', 'string', 'max:60'],
        ]);

        $user = $request->user();
        $user->update(['customization' => [...($user->customization ?? []), ...$validated]]);

        return response()->json(['customization' => $user->customization]);
    }

    /**
     * Store the user's own photo for the background or the banner. Sent as a
     * base64 data URL in JSON: the device web view never delivers multipart.
     */
    public function image(Request $request): JsonResponse
    {
        $request->validate([
            'type' => ['required', Rule::in(['background', 'banner'])],
            'image_base64' => ['required', 'string'],
        ]);

        $image = NativeMediaFile::decodeImageDataUrl($request->string('image_base64'), 8_388_608);
        if ($image === null) {
            return response()->json(['message' => 'That file is not a supported image.'], 422);
        }

        $user = $request->user();
        $type = $request->string('type')->toString();
        $customization = $user->customization ?? [];

        if ($old = $customization["{$type}_image"] ?? null) {
            Storage::disk('public')->delete($old);
        }

        $path = "customization/{$user->id}-{$type}-".Str::random(8).".{$image['extension']}";
        Storage::disk('public')->put($path, $image['contents']);

        $user->update(['customization' => [...$customization, $type => 'photo', "{$type}_image" => $path]]);

        return response()->json(['customization' => $user->customization]);
    }
}
