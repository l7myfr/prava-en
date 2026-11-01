package com.nativephp.mobile.bridge.functions

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.content.FileProvider
import androidx.fragment.app.FragmentActivity
import com.nativephp.mobile.bridge.BridgeError
import com.nativephp.mobile.bridge.BridgeFunction
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * In-app update from the GitHub release APK.
 * Namespace: "Update.*"
 *
 * Local addition, copied in by scripts/patch-nativephp-android.py. Download
 * fetches the APK into the app cache on a background thread, Status reports
 * its progress, and Install hands the finished file to Android's package
 * installer through the cache FileProvider. Installing over the app keeps
 * its data, since the APK is signed with the same key.
 */
object UpdateFunctions {
    private const val TAG = "UpdateFunctions"
    private val allowedHosts = setOf(
        "github.com",
        "objects.githubusercontent.com",
        "release-assets.githubusercontent.com",
    )

    @Volatile private var state = "idle"
    @Volatile private var version = ""
    @Volatile private var downloaded = 0L
    @Volatile private var total = 0L
    @Volatile private var error = ""

    private fun apkFile(context: Context, version: String) =
        File(File(context.cacheDir, "updates"), "Prava-EN-$version.apk")

    private fun status() = mapOf(
        "state" to state,
        "version" to version,
        "downloaded" to downloaded,
        "total" to total,
        "error" to error,
    )

    /**
     * Start downloading the release APK, unless it is already downloading or
     * downloaded. Parameters: url: the release asset URL, version: e.g. 1.8.0
     */
    class Download(private val context: Context) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            val url = parameters["url"] as? String
            val wanted = parameters["version"] as? String
            val host = url?.let { Uri.parse(it).host }
            if (url == null || wanted == null || host == null || host !in allowedHosts) {
                throw BridgeError.InvalidParameters("url must be a GitHub release asset and version is required")
            }

            synchronized(UpdateFunctions) {
                if (version == wanted && (state == "downloading" || state == "done")) {
                    return status()
                }
                state = "downloading"
                version = wanted
                downloaded = 0L
                total = 0L
                error = ""
            }

            Thread {
                val target = apkFile(context, wanted)
                val partial = File(target.path + ".part")
                try {
                    target.parentFile?.listFiles()?.forEach { it.delete() }
                    target.parentFile?.mkdirs()

                    val connection = URL(url).openConnection() as HttpURLConnection
                    connection.instanceFollowRedirects = true
                    connection.connectTimeout = 15_000
                    connection.readTimeout = 30_000
                    connection.connect()
                    if (connection.responseCode !in 200..299) {
                        throw IllegalStateException("HTTP ${connection.responseCode}")
                    }
                    total = connection.contentLengthLong.coerceAtLeast(0L)

                    connection.inputStream.use { input ->
                        partial.outputStream().use { output ->
                            val buffer = ByteArray(64 * 1024)
                            while (true) {
                                val read = input.read(buffer)
                                if (read < 0) break
                                output.write(buffer, 0, read)
                                downloaded += read
                            }
                        }
                    }
                    connection.disconnect()

                    if (!partial.renameTo(target)) {
                        throw IllegalStateException("could not finish the file")
                    }
                    state = "done"
                } catch (e: Exception) {
                    Log.e(TAG, "Update download failed", e)
                    partial.delete()
                    error = e.message ?: e.javaClass.simpleName
                    state = "failed"
                }
            }.start()

            return status()
        }
    }

    /** Returns state (idle, downloading, done, failed), version, downloaded, total, error. */
    class Status : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> = status()
    }

    /**
     * Open Android's installer for the downloaded APK. Without permission to
     * install apps, opens that setting for this app instead and returns
     * needs_permission; calling Install again after allowing it carries on.
     */
    class Install(private val activity: FragmentActivity) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            val file = apkFile(activity, version)
            if (state != "done" || !file.exists()) {
                return mapOf("result" to "not_ready")
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                !activity.packageManager.canRequestPackageInstalls()
            ) {
                activity.runOnUiThread {
                    activity.startActivity(
                        Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:${activity.packageName}"),
                        ),
                    )
                }
                return mapOf("result" to "needs_permission")
            }

            val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", file)
            val intent = Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.runOnUiThread { activity.startActivity(intent) }
            return mapOf("result" to "started")
        }
    }
}
