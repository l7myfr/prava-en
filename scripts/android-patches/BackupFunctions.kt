package com.nativephp.mobile.bridge.functions

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import androidx.fragment.app.FragmentActivity
import com.nativephp.mobile.bridge.BridgeError
import com.nativephp.mobile.bridge.BridgeFunction
import com.nativephp.mobile.utils.NativeActionCoordinator

/**
 * Progress backup that outlives the app.
 * Namespace: "Backup.*"
 *
 * Local addition, copied in by scripts/patch-nativephp-android.py. Uninstalling
 * an Android app deletes its database, so the progress is also written to
 * Download/PravaEN/prava-backup.json, which Android keeps. After a reinstall
 * the new install no longer owns that file and cannot list it, so restoring
 * goes through the system file picker (Pick), whose grant lets Read open it.
 */
object BackupFunctions {

    private const val PREFS = "prava_backup"
    private const val KEY_URI = "uri"
    private const val FILE_NAME = "prava-backup.json"
    private const val FOLDER = "PravaEN"

    /**
     * Write the backup, overwriting this install's earlier copy.
     * Parameters: content: string
     * Returns: success: boolean, location: string
     */
    class Save(private val context: Context) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            val content = parameters["content"] as? String
                ?: throw BridgeError.InvalidParameters("content is required")

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                return mapOf("success" to false, "reason" to "unsupported")
            }

            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val resolver = context.contentResolver

            val existing = prefs.getString(KEY_URI, null)?.let(Uri::parse)
            if (existing != null) {
                try {
                    resolver.openOutputStream(existing, "wt")?.use { it.write(content.toByteArray()) }
                        ?: throw IllegalStateException("no stream")
                    return mapOf("success" to true, "location" to "Download/$FOLDER/$FILE_NAME")
                } catch (e: Exception) {
                    // Deleted by the user, or left over from an earlier install.
                    Log.d("Backup.Save", "Earlier backup not writable, creating a new one: ${e.message}")
                }
            }

            return try {
                val values = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, FILE_NAME)
                    put(MediaStore.MediaColumns.MIME_TYPE, "application/json")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, "${Environment.DIRECTORY_DOWNLOADS}/$FOLDER")
                }
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    ?: throw IllegalStateException("insert failed")
                resolver.openOutputStream(uri, "wt")?.use { it.write(content.toByteArray()) }
                prefs.edit().putString(KEY_URI, uri.toString()).apply()
                mapOf("success" to true, "location" to "Download/$FOLDER/$FILE_NAME")
            } catch (e: Exception) {
                Log.e("Backup.Save", "Backup failed: ${e.message}", e)
                throw BridgeError.ExecutionFailed("Backup failed: ${e.message}")
            }
        }
    }

    /**
     * Open the system file picker. The chosen file arrives in the page as a
     * "native-event" with event "file:chosen" and payload { uri }.
     */
    class Pick(private val activity: FragmentActivity) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            activity.runOnUiThread {
                NativeActionCoordinator.install(activity).launchFilePicker("*/*")
            }
            return mapOf("success" to true)
        }
    }

    /**
     * Read a file the user picked.
     * Parameters: uri: string
     * Returns: content: string
     */
    class Read(private val context: Context) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            val uri = (parameters["uri"] as? String)?.let(Uri::parse)
                ?: throw BridgeError.InvalidParameters("uri is required")

            return try {
                val content = context.contentResolver.openInputStream(uri)?.use {
                    it.readBytes().toString(Charsets.UTF_8)
                } ?: throw IllegalStateException("cannot open file")
                mapOf("success" to true, "content" to content)
            } catch (e: Exception) {
                Log.e("Backup.Read", "Reading backup failed: ${e.message}", e)
                throw BridgeError.ExecutionFailed("Reading backup failed: ${e.message}")
            }
        }
    }
}
