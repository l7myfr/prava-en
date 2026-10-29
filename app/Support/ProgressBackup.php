<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * Keeps a copy of every profile's progress in Download/PravaEN on the device.
 *
 * Uninstalling an Android app deletes its database, but files in Downloads
 * survive, so after a reinstall the user picks that file and gets everything
 * back. Saving happens automatically while studying (see saveSoon), throttled
 * so a burst of answers costs one write.
 */
class ProgressBackup
{
    public const FORMAT = 'prava-en-progress';

    /**
     * Parents first: restoring inserts in this order and deletes in reverse.
     *
     * @var list<string>
     */
    private const TABLES = ['users', 'user_statistics', 'user_question_progress', 'test_templates', 'test_results'];

    private const THROTTLE_SECONDS = 15;

    private const LAST_SAVED_KEY = 'progress_backup.last_saved';

    private const DIRTY_KEY = 'progress_backup.dirty';

    private const AUTO_OFF_KEY = 'progress_backup.auto_off';

    public static function available(): bool
    {
        return (bool) env('NATIVEPHP_RUNNING') && function_exists('nativephp_call');
    }

    /**
     * Whether progress is backed up on its own while studying (Settings).
     */
    public static function autoEnabled(): bool
    {
        return ! Cache::get(self::AUTO_OFF_KEY, false);
    }

    public static function setAutoEnabled(bool $enabled): void
    {
        $enabled ? Cache::forget(self::AUTO_OFF_KEY) : Cache::forever(self::AUTO_OFF_KEY, true);
    }

    /**
     * Save now, unless automatic backups are switched off.
     */
    public static function autoSave(): void
    {
        if (self::autoEnabled()) {
            self::save();
        }
    }

    /**
     * @return array{format: string, version: int, exported_at: string, tables: array<string, list<array<string, mixed>>>}
     */
    public static function export(): array
    {
        $tables = [];
        foreach (self::TABLES as $table) {
            $tables[$table] = DB::table($table)->get()->map(fn ($row) => (array) $row)->all();
        }

        return [
            'format' => self::FORMAT,
            'version' => 1,
            'exported_at' => now()->toISOString(),
            'tables' => $tables,
        ];
    }

    /**
     * Replace all profiles and their progress with the backup's.
     *
     * @param  array<string, mixed>  $backup
     */
    public static function restore(array $backup): int
    {
        if (($backup['format'] ?? null) !== self::FORMAT || ! is_array($backup['tables'] ?? null)) {
            throw new RuntimeException('This file is not a Prava EN backup.');
        }

        DB::transaction(function () use ($backup): void {
            DB::table('personal_access_tokens')->delete();
            foreach (array_reverse(self::TABLES) as $table) {
                DB::table($table)->delete();
            }

            foreach (self::TABLES as $table) {
                $columns = array_flip(Schema::getColumnListing($table));
                $rows = array_map(
                    fn (array $row) => array_intersect_key($row, $columns),
                    array_filter($backup['tables'][$table] ?? [], 'is_array'),
                );

                foreach (array_chunk($rows, 200) as $chunk) {
                    DB::table($table)->insert($chunk);
                }
            }
        });

        return count($backup['tables']['users'] ?? []);
    }

    /**
     * Write the backup file now.
     *
     * @return array{success: bool, location?: string}
     */
    public static function save(): array
    {
        if (! self::available()) {
            return ['success' => false];
        }

        $result = json_decode((string) nativephp_call('Backup.Save', json_encode([
            'content' => json_encode(self::export()),
        ])), true);

        if ($result['success'] ?? false) {
            Cache::forever(self::LAST_SAVED_KEY, now()->timestamp);
            Cache::forget(self::DIRTY_KEY);
        }

        return is_array($result) ? $result : ['success' => false];
    }

    /**
     * Save after progress changed, at most once per few seconds. A change that
     * lands inside the window is saved by the next saveIfDirty().
     */
    public static function saveSoon(): void
    {
        if (! self::available() || ! self::autoEnabled()) {
            return;
        }

        if (now()->timestamp - (int) Cache::get(self::LAST_SAVED_KEY, 0) < self::THROTTLE_SECONDS) {
            Cache::forever(self::DIRTY_KEY, true);

            return;
        }

        self::save();
    }

    public static function saveIfDirty(): void
    {
        if (self::available() && self::autoEnabled() && Cache::get(self::DIRTY_KEY)) {
            self::save();
        }
    }

    public static function lastSavedAt(): ?string
    {
        $timestamp = Cache::get(self::LAST_SAVED_KEY);

        return $timestamp ? date(DATE_ATOM, (int) $timestamp) : null;
    }

    /**
     * Open the system file picker; the choice comes back to the page as a
     * "file:chosen" native event.
     */
    public static function pick(): bool
    {
        if (! self::available()) {
            return false;
        }

        $result = json_decode((string) nativephp_call('Backup.Pick', '{}'), true);

        return (bool) ($result['success'] ?? false);
    }

    public static function read(string $uri): string
    {
        $result = json_decode((string) nativephp_call('Backup.Read', json_encode(['uri' => $uri])), true);

        if (! is_string($result['content'] ?? null)) {
            throw new RuntimeException('The backup file could not be read.');
        }

        return $result['content'];
    }
}
