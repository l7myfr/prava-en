<?php

namespace App\Http\Controllers;

use App\Support\ProgressBackup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * Device-only: write the progress backup now, or restore it from a file the
 * user picks (the way back after uninstalling and reinstalling the app).
 */
class BackupController extends Controller
{
    public function save(): JsonResponse
    {
        return response()->json(ProgressBackup::save() + ['saved_at' => ProgressBackup::lastSavedAt()]);
    }

    public function settings(Request $request): JsonResponse
    {
        $request->validate(['auto' => 'required|boolean']);
        ProgressBackup::setAutoEnabled($request->boolean('auto'));

        return response()->json(['auto' => ProgressBackup::autoEnabled()]);
    }

    public function pick(): JsonResponse
    {
        return response()->json(['success' => ProgressBackup::pick()]);
    }

    public function restore(Request $request): JsonResponse
    {
        $request->validate(['uri' => 'required|string']);

        try {
            $backup = json_decode(ProgressBackup::read($request->string('uri')), true, flags: JSON_THROW_ON_ERROR);
            $profiles = ProgressBackup::restore(is_array($backup) ? $backup : []);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        // The signed-in profile may not exist any more, so start from the picker.
        auth()->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['success' => true, 'profiles' => $profiles]);
    }
}
