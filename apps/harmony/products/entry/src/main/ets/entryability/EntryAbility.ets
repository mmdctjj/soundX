import UIAbility from '@ohos.app.ability.UIAbility';
import hilog from '@ohos.hilog';
import Want from '@ohos.app.ability.Want';
import { window } from '@kit.ArkUI';
import { Logger } from 'audiodock_common';
import { kvStore, fileCache, rdbStore } from 'features_storage';
import { httpClient } from 'features_network';
import { applySetting } from 'features_i18n';
import { installPlaybackService } from '../services/playbackService';

const DOMAIN = 0xA001;
const TAG = 'EntryAbility';

export default class EntryAbility extends UIAbility {
  async onCreate(want: Want, launchParam: number): Promise<void> {
    hilog.info(DOMAIN, TAG, `onCreate launchParam=${launchParam}`);
    Logger.i(TAG, 'onCreate');
    await this.initialize();
    installPlaybackService();
    this.loadPage('pages/Index');
  }

  onDestroy(): void {
    Logger.i(TAG, 'onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    hilog.info(DOMAIN, TAG, 'onWindowStageCreate');
    windowStage.loadContent('pages/Index', (err: Error) => {
      if (err) Logger.e(TAG, `loadContent: ${err.message}`);
    });
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

    Logger.i(TAG, 'initialize complete');
  }

  private loadPage(path: string): void {
    hilog.info(DOMAIN, TAG, `would navigate to ${path}`);
  }
}
