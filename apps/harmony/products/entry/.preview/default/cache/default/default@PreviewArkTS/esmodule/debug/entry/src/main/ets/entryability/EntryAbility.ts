import UIAbility from "@ohos:app.ability.UIAbility";
import type AbilityConstant from "@ohos:app.ability.AbilityConstant";
import hilog from "@ohos:hilog";
import type Want from "@ohos:app.ability.Want";
import type window from "@ohos:window";
import { Logger } from "@bundle:com.audiodock.harmony/entry@audiodock_common/Index";
import { kvStore, fileCache, rdbStore } from "@bundle:com.audiodock.harmony/entry@features_storage/Index";
import { httpClient } from "@bundle:com.audiodock.harmony/entry@features_network/Index";
import { applySetting } from "@bundle:com.audiodock.harmony/entry@features_i18n/Index";
import { installPlaybackService } from "@bundle:com.audiodock.harmony/entry/ets/services/playbackService";
import { installAVSessionService, releaseAVSessionService } from "@bundle:com.audiodock.harmony/entry/ets/services/avSessionService";
const DOMAIN = 0xA001;
const TAG = 'EntryAbility';
export default class EntryAbility extends UIAbility {
    async onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): Promise<void> {
        hilog.info(DOMAIN, TAG, `onCreate launchParam=${launchParam}`);
        Logger.i(TAG, 'onCreate');
        await this.initialize();
        installPlaybackService();
        try {
            await installAVSessionService(this.context);
        }
        catch (e) {
            Logger.w(TAG, `install AVSession: ${String(e)}`);
        }
        this.loadPage('pages/Index');
    }
    onDestroy(): void {
        Logger.i(TAG, 'onDestroy');
        releaseAVSessionService();
    }
    onWindowStageCreate(windowStage: window.WindowStage): void {
        hilog.info(DOMAIN, TAG, 'onWindowStageCreate');
        windowStage.loadContent('pages/Index', (err: Error) => {
            if (err)
                Logger.e(TAG, `loadContent: ${err.message}`);
        });
    }
    private async initialize(): Promise<void> {
        const ctx = this.context;
        await kvStore.init(ctx);
        await fileCache.init(ctx);
        await rdbStore.init(ctx);
        const stored = await kvStore.get('serverAddress');
        if (stored)
            httpClient.setBaseURL(stored);
        const token = await kvStore.get(`token_${stored ?? ''}`);
        if (token)
            httpClient.setAuthToken(token);
        const langSetting = await kvStore.get('app_language');
        if (langSetting === 'zh-CN' || langSetting === 'en')
            applySetting(langSetting);
        else
            applySetting('system');
        Logger.i(TAG, 'initialize complete');
    }
    private loadPage(path: string): void {
        hilog.info(DOMAIN, TAG, `would navigate to ${path}`);
    }
}
