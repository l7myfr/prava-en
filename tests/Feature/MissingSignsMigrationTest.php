<?php

use App\Models\SignCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function missingSignsMigration(): object
{
    $path = collect(glob(database_path('migrations/*_add_missing_signs.php')))->first();

    return require $path;
}

it('adds the missing signs to their groups once, however often it runs', function () {
    DB::table('signs')->delete();
    DB::table('sign_categories')->delete();
    foreach (range(1, 8) as $group) {
        SignCategory::create(['name' => "group {$group}", 'group_number' => $group]);
    }

    missingSignsMigration()->up();
    missingSignsMigration()->up();

    $junction = DB::table('signs')->where('title', 'like', '1.7.2.-1.7.7.%')->get();
    expect($junction)->toHaveCount(1)
        ->and($junction->first()->sign_category_id)->toBe(SignCategory::where('group_number', 1)->value('id'))
        ->and(DB::table('signs')->count())->toBe(28)
        ->and(file_exists(public_path('images/signs/'.$junction->first()->image)))->toBeTrue();
});
