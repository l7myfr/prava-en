package com.nativephp.mobile.bridge.functions

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import com.nativephp.mobile.bridge.BridgeError
import com.nativephp.mobile.bridge.BridgeFunction
import com.nativephp.mobile.ui.MainActivity

/**
 * Switchable launcher icon.
 * Namespace: "AppIcon.*"
 *
 * Local addition, copied in by scripts/patch-nativephp-android.py, which also
 * moves the launcher entry of MainActivity onto one activity-alias per icon.
 * Exactly one alias is enabled at a time; that one is the icon the launcher
 * shows. Android cannot use an arbitrary picture as the app icon, so a photo
 * becomes a pinned home-screen shortcut instead (PinPhoto).
 */
object AppIconFunctions {

    /** Keep in sync with the aliases in AndroidManifest.xml. */
    val ICONS = listOf("default", "wheel", "road", "sign", "car")

    private fun alias(name: String) =
        "com.nativephp.mobile.AppIcon" + name.replaceFirstChar { it.uppercase() }

    /**
     * Switch the launcher icon.
     * Parameters: icon: one of ICONS
     */
    class Set(private val context: Context) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            val icon = parameters["icon"] as? String
            if (icon == null || icon !in ICONS) {
                throw BridgeError.InvalidParameters("icon must be one of $ICONS")
            }

            val pm = context.packageManager
            // Enable the new one first so there is never a moment without a
            // launcher entry; then disable the rest.
            for (name in listOf(icon) + ICONS.filter { it != icon }) {
                pm.setComponentEnabledSetting(
                    ComponentName(context, alias(name)),
                    if (name == icon) PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                    else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.DONT_KILL_APP,
                )
            }
            return mapOf("success" to true, "icon" to icon)
        }
    }

    /** Returns icon: the launcher icon currently enabled. */
    class Get(private val context: Context) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            val pm = context.packageManager
            val current = ICONS.firstOrNull { name ->
                val state = pm.getComponentEnabledSetting(ComponentName(context, alias(name)))
                if (name == "default") state != PackageManager.COMPONENT_ENABLED_STATE_DISABLED
                else state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED
            } ?: "default"
            return mapOf("icon" to current)
        }
    }

    /**
     * Ask the launcher to add a home-screen shortcut that shows the user's
     * photo and opens the app. The launcher asks the user to confirm.
     * Parameters: path: image file on the device, label: shortcut name
     */
    class PinPhoto(private val context: Context) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            val path = parameters["path"] as? String
                ?: throw BridgeError.InvalidParameters("path is required")
            val label = (parameters["label"] as? String)?.takeIf { it.isNotBlank() } ?: "Prava EN"

            if (!ShortcutManagerCompat.isRequestPinShortcutSupported(context)) {
                return mapOf("success" to false, "reason" to "unsupported")
            }

            return try {
                val source = BitmapFactory.decodeFile(path)
                    ?: throw IllegalStateException("not an image")
                val side = minOf(source.width, source.height)
                val square = Bitmap.createBitmap(
                    source, (source.width - side) / 2, (source.height - side) / 2, side, side,
                )
                val icon = Bitmap.createScaledBitmap(square, 256, 256, true)

                val intent = Intent(context, MainActivity::class.java)
                    .setAction(Intent.ACTION_MAIN)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                val shortcut = ShortcutInfoCompat.Builder(context, "prava-photo-${System.currentTimeMillis()}")
                    .setShortLabel(label)
                    .setIcon(IconCompat.createWithAdaptiveBitmap(icon))
                    .setIntent(intent)
                    .build()

                mapOf("success" to ShortcutManagerCompat.requestPinShortcut(context, shortcut, null))
            } catch (e: Exception) {
                Log.e("AppIcon.PinPhoto", "Pinning failed: ${e.message}", e)
                throw BridgeError.ExecutionFailed("Pinning failed: ${e.message}")
            }
        }
    }
}
