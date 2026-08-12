import UIAbility from '@ohos.app.ability.UIAbility';
import AbilityConstant from '@ohos.app.ability.AbilityConstant';
import hilog from '@ohos.hilog';
import Want from '@ohos.app.ability.Want';
import { window } from '@kit.ArkUI';
import { Logger } from 'audiodock_common';
import { kvStore, fileCache, rdbStore } from 'features_storage';
import { httpClient } from 'features_network';
import { applySetting } from 'features_i18n';
import { type ThemeMode } from 'features_ui';
import { installPlaybackService } from '../services/playbackService';
import { installAVSessionService, releaseAVSessionService } from '../services/avSessionService';
import { setSystemBarWindow, applySystemBar } from '../services/systemBar';
import { installWechatRespHandler, registerWechatApp, handleWechatWant } from '../services/WechatPayService';

const DOMAIN = 0xA001;
const TAG = 'EntryAbility';

// 微信开放平台为 AudioDock 申请的 AppID（mobile 端 member-benefits.tsx 里的 WECHAT_APP_ID
// 是 mock 占位未真正使用）。这里必须用真实 AppID，否则 SDK 注册会被微信服务器拒绝（errCode=-1）。
const WECHAT_APP_ID = 'wx42a4102d85be55a1';

export default class EntryAbility extends UIAbility {
  private initPromise: Promise<void> | null = null;

  async onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): Promise<void> {
    hilog.info(DOMAIN, TAG, `onCreate launchParam=${launchParam}`);
    Logger.i(TAG, 'onCreate');
    this.initPromise = this.initialize();
    await this.initPromise;
    // 微信支付 SDK 注册（AppID 必须在 SDK 调起前注册，否则 sendReq 会失败）。
    // 必须放在 onCreate 里、installPlaybackService 之前，确保 SDK 在用户首次支付时已就绪。
    installWechatRespHandler();
    registerWechatApp(WECHAT_APP_ID);
    // 冷启动时微信可能已通过 scheme 回跳（want 里带回调数据），注册完立即透传给 SDK。
    handleWechatWant(want);
    installPlaybackService();
    try {
      await installAVSessionService(this.context);
    } catch (e) {
      Logger.w(TAG, `install AVSession: ${String(e)}`);
    }
    this.loadPage('pages/Index');
  }

  /**
   * 微信支付完成后会通过 scheme `wx42a4102d85be55a1://platformId=wechat` 重新拉起本 Ability。
   * SDK 1.0.10+ 用 openLink 拉起微信，回调通过 onNewWant 触发；必须在这里透传给 SDK。
   */
  onNewWant(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    Logger.i(TAG, `onNewWant uri=${want.uri}`);
    handleWechatWant(want);
  }

  onDestroy(): void {
    Logger.i(TAG, 'onDestroy');
    releaseAVSessionService();
  }

  async onWindowStageCreate(windowStage: window.WindowStage): Promise<void> {
    hilog.info(DOMAIN, TAG, 'onWindowStageCreate');
    // 系统不会等 async onCreate 结束就回调本方法；必须等初始化（语言/主题写入 AppStorage）
    // 完成后再加载页面，否则首帧会用默认中文构建，且 tabBar 等一次性构建的 UI 之后不再刷新。
    if (this.initPromise) await this.initPromise;
    windowStage.loadContent('pages/Index', (err: Error) => {
      if (err) Logger.e(TAG, `loadContent: ${err.message}`);
    });
    windowStage.getMainWindow().then((win: window.Window) => {
      setSystemBarWindow(win);
      const mode: ThemeMode = AppStorage.get<ThemeMode>('themeMode') ?? 'light';
      applySystemBar(mode);
    }).catch((e: Error) => Logger.w(TAG, `getMainWindow: ${e.message}`));
  }

  private async initialize(): Promise<void> {
    const ctx = this.context;
    await kvStore.init(ctx);
    await fileCache.init(ctx);
    await rdbStore.init(ctx);

    const stored = await kvStore.get('serverAddress');
    if (stored) httpClient.setBaseURL(stored);
    const token = await kvStore.get(`token_${stored ?? ''}`);
    if (token) httpClient.setAuthToken(token);

    const langSetting = await kvStore.get('app_language');
    if (langSetting === 'zh-CN' || langSetting === 'en') applySetting(langSetting);
    else applySetting('system');

    // 恢复用户选择的主题模式，供各页面 @StorageLink('themeMode') 响应
    const themeMode = await kvStore.get('themeMode');
    if (themeMode === 'light' || themeMode === 'dark' || themeMode === 'festive') {
      AppStorage.setOrCreate('themeMode', themeMode);
    }

    // 恢复内容模式（音乐/有声书），供首页/声仓 @StorageLink('playMode') 跨页签同步
    const savedPlayMode = await kvStore.get('playMode');
    AppStorage.setOrCreate('playMode', savedPlayMode === 'AUDIOBOOK' ? 'AUDIOBOOK' : 'MUSIC');

    Logger.i(TAG, 'initialize complete');
  }

  private loadPage(path: string): void {
    hilog.info(DOMAIN, TAG, `would navigate to ${path}`);
  }
}
