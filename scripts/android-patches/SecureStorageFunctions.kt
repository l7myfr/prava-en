@file:Suppress("DEPRECATION")

package com.nativephp.mobile.bridge.functions

import android.content.Context
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.nativephp.mobile.bridge.BridgeError
import com.nativephp.mobile.bridge.BridgeFunction

/**
 * Secure storage backed by Android EncryptedSharedPreferences.
 * Namespace: "SecureStorage.*"
 *
 * This is a local addition, applied by scripts/patch-nativephp-android.py.
 * nativephp/mobile shipped SecureStorageFunctions.kt in 2.6.x, dropped it
 * somewhere in 3.x, and 4.3.2 still carries the PHP facade, the JS bridge and
 * the SecureStorageStatus enum with no native implementation behind them on
 * either platform. Its own docs describe the failure as "the plugin isn't
 * installed", but no such plugin is published. Without this the bridge answers
 * METHOD_NOT_FOUND and the device sign-in flow cannot keep its Sanctum token.
 *
 * The body is 2.6.3's, adapted to the wire contract v4's SecureStorageResult
 * expects: Get answers a `status` of found / not_found / unavailable / error
 * rather than 2.6.3's empty string for a miss, which the new PHP side would
 * read as a stored empty value.
 *
 * `accessibility` is accepted and ignored: it maps to iOS Keychain protection
 * classes and has no Android equivalent, since EncryptedSharedPreferences is
 * readable whenever the app is. Ignoring it is what keeps a cross-platform
 * caller from having to branch.
 */
@Suppress("DEPRECATION")
object SecureStorageFunctions {

    private const val PREFS_NAME = "nativephp_secure_storage"

    /**
     * Store a value, or delete it when value is null.
     * Parameters: key: string, value: string|null, accessibility: string (ignored)
     * Returns: success: boolean
     */
    class Set(private val context: Context) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            val key = parameters["key"] as? String
                ?: throw BridgeError.InvalidParameters("key is required")

            val value = parameters["value"] as? String

            return try {
                val prefs = getSecurePrefs(context)
                if (value == null) {
                    prefs.edit().remove(key).apply()
                } else {
                    prefs.edit().putString(key, value).apply()
                }
                mapOf("success" to true)
            } catch (e: Exception) {
                Log.e("SecureStorage.Set", "Error storing value: ${e.message}", e)
                throw BridgeError.ExecutionFailed("Failed to store secure value: ${e.message}")
            }
        }
    }

    /**
     * Read a value.
     * Parameters: key: string
     * Returns: status: "found"|"not_found", value: string|null
     *
     * The "unavailable" status is iOS-only in practice: Android has no
     * equivalent of a Keychain item that exists but cannot be decrypted right
     * now, so a miss here is always a genuine absence.
     */
    class Get(private val context: Context) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            val key = parameters["key"] as? String
                ?: throw BridgeError.InvalidParameters("key is required")

            return try {
                val value = getSecurePrefs(context).getString(key, null)

                if (value == null) {
                    mapOf("status" to "not_found")
                } else {
                    mapOf("status" to "found", "value" to value)
                }
            } catch (e: Exception) {
                Log.e("SecureStorage.Get", "Error retrieving value: ${e.message}", e)
                throw BridgeError.ExecutionFailed("Failed to retrieve secure value: ${e.message}")
            }
        }
    }

    /**
     * Delete a value.
     * Parameters: key: string
     * Returns: success: boolean
     */
    class Delete(private val context: Context) : BridgeFunction {
        override fun execute(parameters: Map<String, Any>): Map<String, Any> {
            val key = parameters["key"] as? String
                ?: throw BridgeError.InvalidParameters("key is required")

            return try {
                getSecurePrefs(context).edit().remove(key).apply()
                mapOf("success" to true)
            } catch (e: Exception) {
                Log.e("SecureStorage.Delete", "Error deleting value: ${e.message}", e)
                throw BridgeError.ExecutionFailed("Failed to delete secure value: ${e.message}")
            }
        }
    }

    private fun getSecurePrefs(context: Context): EncryptedSharedPreferences {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        return EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        ) as EncryptedSharedPreferences
    }
}
