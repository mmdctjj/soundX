package expo.modules.systemdownloadmanager

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class DownloadCompleteReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
    if (downloadId == -1L) {
      return
    }

    val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
    val query = DownloadManager.Query().setFilterById(downloadId)

    downloadManager.query(query)?.use { cursor ->
      if (!cursor.moveToFirst()) {
        return@use
      }

      val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
      if (statusIndex < 0 || cursor.getInt(statusIndex) != DownloadManager.STATUS_SUCCESSFUL) {
        return@use
      }

      val uri = downloadManager.getUriForDownloadedFile(downloadId)
      if (uri == null) {
        Log.e("DownloadCompleteReceiver", "无法获取下载文件 URI")
        return@use
      }

      try {
        val installIntent = Intent(Intent.ACTION_VIEW).apply {
          setDataAndType(uri, "application/vnd.android.package-archive")
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(installIntent)
      } catch (e: Exception) {
        Log.e("DownloadCompleteReceiver", "启动安装失败: ${e.message}")
      }
    }
  }
}
