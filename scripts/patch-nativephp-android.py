#!/usr/bin/env python3
"""Re-apply local patches to the generated nativephp/android tree.

`php artisan native:install --force` regenerates nativephp/android from
vendor/nativephp/mobile/resources/androidstudio, silently discarding anything we
changed there. The directory is gitignored, so nothing warns you. Run this after
every native:install, and before building a release.

Idempotent: patches already applied are reported as "ok" and left alone.

    php artisan native:install --force
    python3 scripts/patch-nativephp-android.py

What is NOT here any more. Everything this script used to do about thread safety
was removed when the app moved to nativephp/mobile 4.x, which fixes it upstream
and better: the shipped php_bridge.c now carries four named mutexes, boots one
persistent interpreter per process instead of restarting the engine per request,
and gates the boot artisan commands on whether the bundle was actually
re-extracted. Re-applying our own recursive lock on top of that would be, at
best, redundant. The fragment-transaction fix and the on-device config:cache are
upstream now too. What remains below is only the handful of things upstream
still does not do.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Defaults to the generated tree; a target can be passed for testing against a
# pristine copy of the upstream template.
ANDROID = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "nativephp" / "android"
JAVA = ANDROID / "app/src/main/java/com/nativephp/mobile"
CPP = ANDROID / "app/src/main/cpp"
SOURCES = ROOT / "scripts" / "android-patches"

# Whole files we add to the generated tree, rather than edits to upstream ones.
FILE_COPIES = [
    {
        "name": "ReviewFunctions.kt: Play in-app review bridge function",
        "src": SOURCES / "ReviewFunctions.kt",
        "dst": JAVA / "bridge/functions/ReviewFunctions.kt",
    },
    {
        "name": "SecureStorageFunctions.kt: the secure storage bridge upstream dropped",
        "src": SOURCES / "SecureStorageFunctions.kt",
        "dst": JAVA / "bridge/functions/SecureStorageFunctions.kt",
    },
    {
        "name": "BackupFunctions.kt: progress backup that survives uninstalling",
        "src": SOURCES / "BackupFunctions.kt",
        "dst": JAVA / "bridge/functions/BackupFunctions.kt",
    },
]

GUARD = '''            Handler(Looper.getMainLooper()).post {
                // Bundle extraction can outlive this Activity. The user may leave or
                // background the app while it runs, and it runs longest right after an
                // update, when the bundle is re-extracted. Calling onReady() then commits
                // a fragment onto a state-saved or destroyed FragmentManager, which throws
                // IllegalStateException and kills the process on launch.
                if (isFinishing || isDestroyed) {
                    Log.d("LaravelInit", "⏹ Activity gone before init finished, skipping onReady")
                    return@post
                }
                onReady()
            }'''

EDGE_OLD = """    @Suppress("DEPRECATION")
    private fun configureStatusBar() {
        val windowInsetsController = WindowInsetsControllerCompat(window, window.decorView)

        // Make status bar and navigation bar transparent for edge-to-edge
        window.statusBarColor = android.graphics.Color.TRANSPARENT
        window.navigationBarColor = android.graphics.Color.TRANSPARENT
"""

EDGE_NEW = """    private fun configureStatusBar() {
        val windowInsetsController = WindowInsetsControllerCompat(window, window.decorView)

        // System bars are transparent automatically in edge-to-edge mode
        // (setDecorFitsSystemWindows(false)); the deprecated window.statusBarColor /
        // navigationBarColor setters are intentionally omitted for Android 15+.
"""

PATCHES = [
    {
        "name": "MainActivity: skip onReady() when the Activity is gone",
        "path": JAVA / "ui/MainActivity.kt",
        "old": "            Handler(Looper.getMainLooper()).post {\n                onReady()\n            }",
        "new": GUARD,
        "applied": "skipping onReady",
        "why": "onReady() sets up the WebView and loads a URL; none of it is valid "
               "on a dead Activity.",
    },
    {
        "name": "MainActivity: drop the deprecated edge-to-edge setters",
        "path": JAVA / "ui/MainActivity.kt",
        "old": EDGE_OLD,
        "new": EDGE_NEW,
        "applied": "navigationBarColor setters are intentionally omitted",
        "why": "Play flags these as deprecated APIs for edge-to-edge. "
               "setDecorFitsSystemWindows(false) already makes the bars transparent "
               "on Android 15+, so the setters are dead weight and the @Suppress with them.",
    },
    {
        "name": "MainActivity: import enableEdgeToEdge",
        "path": JAVA / "ui/MainActivity.kt",
        "old": "import androidx.activity.addCallback\n",
        "new": "import androidx.activity.addCallback\n"
               "import androidx.activity.enableEdgeToEdge\n",
        "applied": "import androidx.activity.enableEdgeToEdge",
        "why": "Pairs with the enableEdgeToEdge() call below.",
    },
    {
        "name": "MainActivity: go edge-to-edge with enableEdgeToEdge()",
        "path": JAVA / "ui/MainActivity.kt",
        "old": "        // Android 15 edge-to-edge compatibility fix\n"
               "        WindowCompat.setDecorFitsSystemWindows(window, false)\n",
        "new": "        // Edge-to-edge on every API level, not just 35+ where it is enforced.\n"
               "        // Play flags setDecorFitsSystemWindows as the deprecated route.\n"
               "        enableEdgeToEdge()\n",
        "applied": "        enableEdgeToEdge()\n",
        "why": "Play warns \"Edge-to-edge may not display for all users\" unless the app "
               "opts in for older Android versions too.",
    },
    {
        "name": "MainActivity: ignore shakes until PHP has booted",
        "path": JAVA / "ui/MainActivity.kt",
        "old": "            shakeDetector = ShakeDetector {\n"
               "                NativeElementBridge.sendNativeEvent(",
        "new": "            shakeDetector = ShakeDetector {\n"
               "                // onResume() registers this before the boot thread has loaded\n"
               "                // libphp_wrapper, so an early shake hits an unlinked JNI method\n"
               "                // and throws UnsatisfiedLinkError (Play, versionCode 34).\n"
               "                if (!bootReady) return@ShakeDetector\n"
               "                NativeElementBridge.sendNativeEvent(",
        "applied": "if (!bootReady) return@ShakeDetector",
        "why": "A shake during startup called nativeElementWriteEvent before the native "
               "library was loaded and killed the app.",
    },
    {
        "name": "BridgeFunctionRegistration: import SecureStorageFunctions",
        "path": JAVA / "bridge/BridgeFunctionRegistration.kt",
        "old": "import com.nativephp.mobile.bridge.functions.SystemFunctions\n",
        "new": "import com.nativephp.mobile.bridge.functions.SecureStorageFunctions\n"
               "import com.nativephp.mobile.bridge.functions.SystemFunctions\n",
        "applied": "import com.nativephp.mobile.bridge.functions.SecureStorageFunctions",
        "why": "Pairs with the SecureStorage.* registrations below.",
    },
    {
        "name": "BridgeFunctionRegistration: register SecureStorage.*",
        "path": JAVA / "bridge/BridgeFunctionRegistration.kt",
        "old": '    registry.register("System.GetAppearance", SystemFunctions.GetAppearance(context))\n',
        "new": '    registry.register("System.GetAppearance", SystemFunctions.GetAppearance(context))\n\n'
               '    // SecureStorage.* — local addition. v4 ships the PHP facade and the JS\n'
               '    // bridge but no native implementation, and no plugin provides one.\n'
               '    registry.register("SecureStorage.Set", SecureStorageFunctions.Set(context))\n'
               '    registry.register("SecureStorage.Get", SecureStorageFunctions.Get(context))\n'
               '    registry.register("SecureStorage.Delete", SecureStorageFunctions.Delete(context))\n',
        "applied": 'registry.register("SecureStorage.Set"',
        "why": "Without these the bridge answers METHOD_NOT_FOUND and device sign-in "
               "cannot store its Sanctum token.",
    },
    {
        "name": "BridgeFunctionRegistration: import BackupFunctions",
        "path": JAVA / "bridge/BridgeFunctionRegistration.kt",
        "old": "import com.nativephp.mobile.bridge.functions.SystemFunctions\n",
        "new": "import com.nativephp.mobile.bridge.functions.BackupFunctions\n"
               "import com.nativephp.mobile.bridge.functions.SystemFunctions\n",
        "applied": "import com.nativephp.mobile.bridge.functions.BackupFunctions",
        "why": "Pairs with the Backup.* registrations below.",
    },
    {
        "name": "BridgeFunctionRegistration: register Backup.*",
        "path": JAVA / "bridge/BridgeFunctionRegistration.kt",
        "old": '    registry.register("System.OpenAppSettings", SystemFunctions.OpenAppSettings(context))\n',
        "new": '    registry.register("System.OpenAppSettings", SystemFunctions.OpenAppSettings(context))\n'
               '    registry.register("Backup.Save", BackupFunctions.Save(context))\n'
               '    registry.register("Backup.Pick", BackupFunctions.Pick(activity))\n'
               '    registry.register("Backup.Read", BackupFunctions.Read(context))\n',
        "applied": 'registry.register("Backup.Save"',
        "why": "Uninstalling deletes the app database; the backup file in Downloads "
               "is what lets progress come back after a reinstall.",
    },
    {
        "name": "BridgeFunctionRegistration: import ReviewFunctions",
        "path": JAVA / "bridge/BridgeFunctionRegistration.kt",
        "old": "import com.nativephp.mobile.bridge.functions.SystemFunctions\n",
        "new": "import com.nativephp.mobile.bridge.functions.ReviewFunctions\n"
               "import com.nativephp.mobile.bridge.functions.SystemFunctions\n",
        "applied": "import com.nativephp.mobile.bridge.functions.ReviewFunctions",
        "why": "Pairs with the Review.Request registration below.",
    },
    {
        "name": "BridgeFunctionRegistration: register Review.Request",
        "path": JAVA / "bridge/BridgeFunctionRegistration.kt",
        "old": '    registry.register("System.OpenAppSettings", SystemFunctions.OpenAppSettings(context))\n',
        "new": '    registry.register("System.OpenAppSettings", SystemFunctions.OpenAppSettings(context))\n'
               '    registry.register("Review.Request", ReviewFunctions.Request(activity))\n',
        "applied": 'registry.register("Review.Request"',
        "why": "Without this the bridge returns null for Review.Request and the app "
               "falls back to opening the store listing, which still works but converts worse.",
    },
    {
        "name": "build.gradle.kts: add the Play review library",
        "path": ANDROID / "app/build.gradle.kts",
        "old": '    implementation("androidx.camera:camera-view:$camerax_version")\n}\n',
        "new": '    implementation("androidx.camera:camera-view:$camerax_version")\n\n'
               '    // Google Play in-app review overlay (local addition, see ReviewFunctions.kt)\n'
               '    implementation("com.google.android.play:review-ktx:2.0.2")\n}\n',
        "applied": "com.google.android.play:review-ktx",
        "why": "ReviewFunctions.kt will not compile without it.",
    },
]

# The Gradle line is a deletion rather than a replacement, handled separately.
GRADLE = ANDROID / "app/build.gradle.kts"
KEEP_SYMBOLS = 'keepDebugSymbols.add("**/*.so")'

# Theme items Play reports as deprecated edge-to-edge APIs on Android 15+.
# enableEdgeToEdge() makes the bars transparent instead.
THEMES = [
    ANDROID / "app/src/main/res/values/themes.xml",
    ANDROID / "app/src/main/res/values-night/themes.xml",
]
DEPRECATED_THEME_ITEMS = ('name="android:statusBarColor"', 'name="android:navigationBarColor"')


def copy_added_files() -> int:
    failures = 0
    for f in FILE_COPIES:
        src: Path = f["src"]
        dst: Path = f["dst"]

        if not src.exists():
            print(f"[MISS] {f['name']}\n       source not found: {src}")
            failures += 1
            continue

        wanted = src.read_text()
        if dst.exists() and dst.read_text() == wanted:
            print(f"[ ok ] {f['name']} (already copied)")
            continue

        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(wanted)
        print(f"[ + ] {f['name']}")
        print(f"       copied from {src.relative_to(ROOT)}")
    return failures


def apply_text_patches() -> int:
    failures = 0
    for p in PATCHES:
        path: Path = p["path"]
        if not path.exists():
            print(f"[MISS] {p['name']}\n       file not found: {path}")
            failures += 1
            continue

        text = path.read_text()
        if p["applied"] in text:
            print(f"[ ok ] {p['name']} (already applied)")
            continue
        if p["old"] not in text:
            print(f"[FAIL] {p['name']}\n       pattern not found in {path}")
            print("       Upstream probably changed. Re-check the source before building.")
            failures += 1
            continue

        path.write_text(text.replace(p["old"], p["new"], 1))
        print(f"[ + ] {p['name']}")
        print(f"       {p['why']}")
    return failures


def strip_keep_debug_symbols() -> int:
    name = "build.gradle.kts: drop keepDebugSymbols so Play gets real symbols"
    if not GRADLE.exists():
        print(f"[MISS] {name}\n       file not found: {GRADLE}")
        return 1

    lines = GRADLE.read_text().splitlines(keepends=True)
    kept = [ln for ln in lines if KEEP_SYMBOLS not in ln or ln.lstrip().startswith("//")]
    if len(kept) == len(lines):
        print(f"[ ok ] {name} (already absent)")
        return 0

    GRADLE.write_text("".join(kept))
    print(f"[ + ] {name}")
    print("       Keeping symbols makes strip a no-op, so AGP extracts nothing and")
    print("       the AAB ships with no debug symbols at all.")
    return 0


def strip_deprecated_theme_items() -> int:
    failures = 0
    for theme in THEMES:
        name = f"{theme.parent.name}/themes.xml: drop statusBarColor / navigationBarColor"
        if not theme.exists():
            print(f"[MISS] {name}\n       file not found: {theme}")
            failures += 1
            continue

        lines = theme.read_text().splitlines(keepends=True)
        kept = [ln for ln in lines if not any(item in ln for item in DEPRECATED_THEME_ITEMS)]
        if len(kept) == len(lines):
            print(f"[ ok ] {name} (already absent)")
            continue

        theme.write_text("".join(kept))
        print(f"[ + ] {name}")
        print("       Play flags these as deprecated edge-to-edge APIs; enableEdgeToEdge()")
        print("       makes the bars transparent instead.")
    return failures


def main() -> int:
    if not ANDROID.is_dir():
        print(f"nativephp/android not found at {ANDROID}")
        print("Run `php artisan native:install --force` first.")
        return 1

    try:
        where = ANDROID.relative_to(ROOT)
    except ValueError:
        where = ANDROID
    print(f"Patching {where}\n")
    failures = (
        copy_added_files()
        + apply_text_patches()
        + strip_keep_debug_symbols()
        + strip_deprecated_theme_items()
    )
    print()
    if failures:
        print(f"{failures} patch(es) could not be applied. Do not ship until resolved.")
        return 1
    print("All patches in place.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
