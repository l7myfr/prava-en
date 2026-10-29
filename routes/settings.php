<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    // Profile update/delete (used by settings sheet)
    // Using POST for profile update to support file uploads via NativePHP
    Route::post('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // The device web view only forwards a request body for POST/PUT/PATCH,
    // so the app saves the category and deletes the profile through POST.
    Route::post('settings/license', [ProfileController::class, 'license'])->name('profile.license');
    Route::post('settings/profile/delete', [ProfileController::class, 'destroy'])->name('profile.destroy.post');

    // Password update (used by settings sheet)
    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');
});
