package com.nativephp.mobile.bridge.functions

import android.Manifest
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.util.Log
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.nativephp.mobile.bridge.BridgeError
import com.nativephp.mobile.bridge.BridgeFunction
import com.nativephp.mobile.utils.WebViewProvider
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.zip.CRC32
import java.util.zip.GZIPInputStream
import java.util.zip.GZIPOutputStream

/**
 * Progress backup that outlives the app.
 * Namespace: "Backup.*"
 *
 * Local addition, copied in by scripts/patch-nativephp-android.py. Uninstalling
 * an Android app deletes its database, so the progress is also written out to
 * shared storage, which Android keeps:
 *
 *  - Download/PravaEN/prava-backup.json, the plain file a person can find.
 *  - Pictures/PravaEN/prava-backup.png, a picture with the same data packed in
 *    a private PNG chunk. A reinstalled app cannot read files its earlier
 *    install left in Downloads, but with photo access it can read pictures,
 *    so Find locates this one and restores without the user hunting for it.
 *
 * When Find comes up empty, Pick opens the system file picker in the folder.
 */
object BackupFunctions {

    private const val PREFS = "prava_backup"
    private const val KEY_URI = "uri"
    private const val KEY_IMAGE_URI = "image_uri"
    private const val FILE_NAME = "prava-backup.json"
    private const val IMAGE_NAME = "prava-backup.png"
    private const val FOLDER = "PravaEN"

    /** Ancillary, private, safe-to-copy PNG chunk holding gzipped JSON. */
    private val CHUNK_TYPE = "prVb".toByteArray(Charsets.US_ASCII)

    /**
     * Write the backup, overwriting this install's earlier copies.
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

            return try {
                write(
                    context, KEY_URI, MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    FILE_NAME, "application/json", Environment.DIRECTORY_DOWNLOADS,
                    content.toByteArray(Charsets.UTF_8),
                )
                try {
                    write(
                        context, KEY_IMAGE_URI, MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                        IMAGE_NAME, "image/png", Environment.DIRECTORY_PICTURES,
                        backupImage(content),
                    )
                } catch (e: Exception) {
                    // The plain file is what counts; the picture only helps Find.
                    Log.w("Backup.Save", "Picture copy failed: ${e.message}")
                }
                mapOf("success" to true, "location" to "Download/$FOLDER/$FILE_NAME")
            } catch (e: Exception) {
                Log.e("Backup.Save", "Backup failed: ${e.message}", e)
                throw BridgeError.ExecutionFailed("Backup failed: ${e.message}")
            }
        }
    }

    /**
     * Look for a backup picture left by this or an earlier install, asking
     * for photo access first. Answers in the page as a "native-event" with
     * event "backup:found" and payload { found, uri?, reason? }.
     */
    class Find(private val activity: FragmentActivity) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            val permission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                Manifest.permission.READ_MEDIA_IMAGES
            } else {
                Manifest.permission.READ_EXTERNAL_STORAGE
            }

            activity.runOnUiThread {
                if (ContextCompat.checkSelfPermission(activity, permission) == PackageManager.PERMISSION_GRANTED) {
                    report(activity, search(activity))
                    return@runOnUiThread
                }

                var launcher: ActivityResultLauncher<String>? = null
                launcher = activity.activityResultRegistry.register(
                    "prava-backup-find-${System.nanoTime()}",
                    ActivityResultContracts.RequestPermission(),
                ) { granted ->
                    launcher?.unregister()
                    report(activity, if (granted) search(activity) else JSONObject().put("found", false).put("reason", "denied"))
                }
                launcher.launch(permission)
            }
            return mapOf("success" to true)
        }

        private fun search(context: Context): JSONObject {
            val selection = MediaStore.MediaColumns.DISPLAY_NAME + " LIKE ?"
            val order = MediaStore.MediaColumns.DATE_MODIFIED + " DESC"
            try {
                context.contentResolver.query(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    arrayOf(MediaStore.MediaColumns._ID),
                    selection, arrayOf("prava-backup%"), order,
                )?.use { cursor ->
                    while (cursor.moveToNext()) {
                        val uri = ContentUris.withAppendedId(
                            MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cursor.getLong(0),
                        )
                        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                        if (bytes != null && extract(bytes) != null) {
                            return JSONObject().put("found", true).put("uri", uri.toString())
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w("Backup.Find", "Search failed: ${e.message}")
            }
            return JSONObject().put("found", false).put("reason", "none")
        }

        private fun report(activity: FragmentActivity, payload: JSONObject) =
            dispatch(activity, "backup:found", payload)
    }

    /**
     * Open the system file picker, starting in Download/PravaEN so the backup
     * is one tap away. The chosen file arrives in the page as a "native-event"
     * with event "file:chosen" and payload { uri }.
     */
    class Pick(private val activity: FragmentActivity) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            activity.runOnUiThread {
                // registry.register (no lifecycle owner) may be called at any
                // time, unlike registerForActivityResult; unregister after use.
                var launcher: ActivityResultLauncher<Array<String>>? = null
                launcher = activity.activityResultRegistry.register(
                    "prava-backup-pick-${System.nanoTime()}",
                    StartInFolder(),
                ) { uri ->
                    launcher?.unregister()
                    uri ?: return@register
                    dispatch(activity, "file:chosen", JSONObject().put("uri", uri.toString()))
                }
                launcher.launch(arrayOf("*/*"))
            }
            return mapOf("success" to true)
        }
    }

    /**
     * Read a backup the user picked or Find located: the JSON file itself, or
     * the data packed inside the backup picture.
     * Parameters: uri: string
     * Returns: content: string
     */
    class Read(private val context: Context) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            val uri = (parameters["uri"] as? String)?.let(Uri::parse)
                ?: throw BridgeError.InvalidParameters("uri is required")

            return try {
                val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                    ?: throw IllegalStateException("cannot open file")
                val content = extract(bytes) ?: bytes.toString(Charsets.UTF_8)
                mapOf("success" to true, "content" to content)
            } catch (e: Exception) {
                Log.e("Backup.Read", "Reading backup failed: ${e.message}", e)
                throw BridgeError.ExecutionFailed("Reading backup failed: ${e.message}")
            }
        }
    }

    private class StartInFolder : ActivityResultContracts.OpenDocument() {
        override fun createIntent(context: Context, input: Array<String>): Intent =
            super.createIntent(context, input).apply {
                putExtra(
                    DocumentsContract.EXTRA_INITIAL_URI,
                    DocumentsContract.buildDocumentUri(
                        "com.android.externalstorage.documents",
                        "primary:${Environment.DIRECTORY_DOWNLOADS}/$FOLDER",
                    ),
                )
            }
    }

    /** Overwrite this install's earlier copy, or create one if it is gone. */
    private fun write(
        context: Context, key: String, collection: Uri, name: String,
        mime: String, directory: String, data: ByteArray,
    ) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val resolver = context.contentResolver

        prefs.getString(key, null)?.let(Uri::parse)?.let { existing ->
            try {
                resolver.openOutputStream(existing, "wt")?.use { it.write(data) }
                    ?: throw IllegalStateException("no stream")
                return
            } catch (e: Exception) {
                // Deleted by the user, or left over from an earlier install.
                Log.d("Backup.Save", "Earlier $name not writable, creating a new one: ${e.message}")
            }
        }

        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, name)
            put(MediaStore.MediaColumns.MIME_TYPE, mime)
            put(MediaStore.MediaColumns.RELATIVE_PATH, "$directory/$FOLDER")
        }
        val uri = resolver.insert(collection, values) ?: throw IllegalStateException("insert failed")
        resolver.openOutputStream(uri, "wt")?.use { it.write(data) }
        prefs.edit().putString(key, uri.toString()).apply()
    }

    /** A card saying what the picture is, with the backup in a PNG chunk. */
    private fun backupImage(content: String): ByteArray {
        val bitmap = Bitmap.createBitmap(720, 300, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.parseColor("#1E3A8A"))
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            textSize = 60f
            typeface = Typeface.DEFAULT_BOLD
        }
        canvas.drawText("Prava EN", 48f, 112f, paint)
        paint.textSize = 32f
        paint.typeface = Typeface.DEFAULT
        canvas.drawText("Progress backup. Keep this picture.", 48f, 176f, paint)
        paint.textSize = 26f
        paint.color = Color.parseColor("#BFDBFE")
        canvas.drawText(SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).format(Date()), 48f, 236f, paint)

        val png = ByteArrayOutputStream().also { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }.toByteArray()
        val data = ByteArrayOutputStream().also { out ->
            GZIPOutputStream(out).use { it.write(content.toByteArray(Charsets.UTF_8)) }
        }.toByteArray()

        val crc = CRC32().apply { update(CHUNK_TYPE); update(data) }
        val chunk = ByteBuffer.allocate(12 + data.size)
            .putInt(data.size).put(CHUNK_TYPE).put(data).putInt(crc.value.toInt())
            .array()

        // The IEND chunk is always the last 12 bytes; ours goes right before it.
        val split = png.size - 12
        return png.copyOfRange(0, split) + chunk + png.copyOfRange(split, png.size)
    }

    /** The JSON packed in a backup picture, or null for anything else. */
    private fun extract(bytes: ByteArray): String? {
        if (bytes.size < 8 || bytes[1] != 'P'.code.toByte() || bytes[2] != 'N'.code.toByte()) return null
        val buffer = ByteBuffer.wrap(bytes)
        var offset = 8
        while (offset + 12 <= bytes.size) {
            val length = buffer.getInt(offset)
            if (length < 0 || offset + 12 + length > bytes.size) return null
            val type = bytes.copyOfRange(offset + 4, offset + 8)
            if (type.contentEquals(CHUNK_TYPE)) {
                val data = bytes.copyOfRange(offset + 8, offset + 8 + length)
                return GZIPInputStream(data.inputStream()).use { it.readBytes() }.toString(Charsets.UTF_8)
            }
            offset += 12 + length
        }
        return null
    }

    private fun dispatch(activity: FragmentActivity, event: String, payload: JSONObject) {
        val js = """
            document.dispatchEvent(new CustomEvent("native-event", {
                detail: { event: ${JSONObject.quote(event)}, payload: $payload }
            }));
        """.trimIndent()
        (activity as? WebViewProvider)?.getWebViewOrNull()?.evaluateJavascript(js, null)
    }
}
