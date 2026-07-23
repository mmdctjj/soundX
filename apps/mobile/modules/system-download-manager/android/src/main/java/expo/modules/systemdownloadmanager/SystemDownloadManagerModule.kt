package expo.modules.systemdownloadmanager

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class SystemDownloadManagerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context not available")

  override fun definition() = ModuleDefinition {
    Name("SystemDownloadManager")

    Function("downloadApk") { url: String, fileName: String?, title: String?, description: String? ->
      val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
      val actualFileName = fileName ?: getFileNameFromUrl(url)
      val downloadDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
        ?: context.filesDir
      if (!downloadDir.exists()) {
        downloadDir.mkdirs()
      }
      val destFile = File(downloadDir, actualFileName)

      if (destFile.exists()) {
        destFile.delete()
      }

      val request = DownloadManager.Request(Uri.parse(url))
        .setTitle(title ?: "AudioDock")
        .setDescription(description ?: "正在下载新版本")
        .setDestinationUri(Uri.fromFile(destFile))
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setMimeType("application/vnd.android.package-archive")
        .setAllowedOverMetered(true)
        .setAllowedOverRoaming(true)

      try {
        val downloadId = downloadManager.enqueue(request)
        downloadId.toString()
      } catch (e: Exception) {
        throw Exception("创建系统下载任务失败: ${e.message}")
      }
    }
  }

  private fun getFileNameFromUrl(url: String): String {
    return try {
      url.split("?")[0].split("/").lastOrNull() ?: "update.apk"
    } catch (e: Exception) {
      "update.apk"
    }
  }
}
