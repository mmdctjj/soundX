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

const DOMAIN = 0xA001;
const TAG = 'EntryAbility';

export default class EntryAbility extends UIAbility {
  private initPromise: Promise<void> | null = null;

  async onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): Promise<void> {
    hilog.info(DOMAIN, TAG, `onCreate launchParam=${launchParam}`);
    Logger.i(TAG, 'onCreate');
    this.initPromise = this.initialize();
    await this.initPromise;
    installPlaybackService();
    try {
      await installAVSessionService(this.context);
    } catch (e) {
      Logger.w(TAG, `install AVSession: ${String(e)}`);
    }
    this.loadPage('pages/Index');
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

    Logger.i(TAG, 'initialize complete');
  }

  private loadPage(path: string): void {
    hilog.info(DOMAIN, TAG, `would navigate to ${path}`);
  }
}
