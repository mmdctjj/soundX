package com.audiodock.app.wxapi

import android.app.Activity
import android.os.Bundle
import com.theweflex.react.WeChatModule

class WXEntryActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    WeChatModule.handleIntent(intent)
    finish()
  }
}
