<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * Illustrated study notes. The content itself is bundled with the frontend
 * (resources/js/rules/chapters.json, built by scripts/build-rules.mjs), so the
 * server only picks the page.
 */
class RulesController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('rules/index');
    }

    public function show(string $chapter): Response
    {
        abort_unless(preg_match('/^\d{2}$/', $chapter) === 1, 404);

        return Inertia::render('rules/show', ['chapter' => $chapter]);
    }
}
