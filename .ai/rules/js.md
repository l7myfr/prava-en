---
paths:
  - 'resources/js/**/*.tsx'
---

# Js

## Android back press reaches the page late, so popstate modals need two presses
NativePHP's MainActivity intercepts every Android back press and routes it through `webView.canGoBack() -> webView.goBack()` (vendor/nativephp/mobile/resources/androidstudio/app/src/main/java/com/nativephp/mobile/ui/MainActivity.kt:158). The first press is consumed by the WebView back-forward list without emitting `popstate` at all, so the "push a history entry, close the modal on popstate" pattern (user-selection.tsx) needs two presses to close a form. Verified on device 2026-08-11 by instrumenting popstate: press 1 = no event, form open; press 2 = event fires, handler closes correctly and history.length stays stable.

Do not chase this in React - the handler itself is fine. A real fix means handling back in the native layer instead of via popstate. Known and accepted for now.

## Same-URL back must not reach Inertia's history restore
Pages and overlays push extra entries with the page's own URL to catch back. Inertia's popstate handler restores any entry carrying its page state with `preserveState: false`, which remounts the page from the props it was first loaded with — a running test lost every answer given since it opened. `keepPageOnSameUrlBack()` in `resources/js/lib/back-layers.ts` (installed in `app.tsx`) runs in the capture phase and blanks `event.state` when the URL didn't change, so Inertia leaves the page alone. Don't push history entries that rely on Inertia restoring the same page.
