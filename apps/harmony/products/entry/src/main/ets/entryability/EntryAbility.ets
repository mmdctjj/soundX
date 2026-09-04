import UIAbility from '@ohos.app.ability.UIAbility';
import AbilityConstant from '@ohos.app.ability.AbilityConstant';
import hilog from '@ohos.hilog';
import Want from '@ohos.app.ability.Want';
import { window } from '@kit.ArkUI';
import router from '@ohos.router';
import { bundleManager, ConfigurationConstant, Configuration } from '@kit.AbilityKit';
import { Logger, getSelfBundleInfo, getSelfAppVersion } from 'audiodock_common';
import { kvStore, fileCache, rdbStore } from 'features_storage';
import { httpClient } from 'features_network';
import { applySetting } from 'features_i18n';
import { type ThemeMode } from 'features_ui';
import { installPlaybackService } from '../services/playbackService';
import { installAVSessionService, releaseAVSessionService } from '../services/avSessionService';
import { setSystemBarWindow, applySystemBar } from '../services/systemBar';
import { themeAutoStore } from '../context/ThemeAutoStore';
import { authStore } from '../context/AuthStore';
import { refreshNetworkMode } from '../utils/networkMode';
import { installWechatRespHandler, registerWechatApp, handleWechatWant } from '../services/WechatPayService';
import { widgetBridge } from '../services/WidgetBridge';
import { widgetCommandHandler } from '../services/WidgetCommandHandler';

/** Bundle信息摘要接口 */
interface BundleInfoSummary {
  name: string;
  versionName: string;
  versionCode: number;
  hapModules: string[];
  permissions: string[];
  appId?: string;
  hasSignature: boolean;
}

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

    // ===== 桌面小部件数据推送 =====
    // 订阅 playerStore / likesHistory 变化 → 写 kvStore + formProvider.updateForm
    widgetBridge.install();
    // 拉一次 VIP / 歌单 / 历史 / 上新（不阻塞主流程，失败仅 warn）
    widgetBridge.refreshAll().catch((e: Error): void => {
      Logger.w(TAG, `widgetBridge.refreshAll: ${e.message}`);
    });

    // ===== 接口落点探测（debug only）=====
    // 通过 bundleManager.getBundleInfoForSelf 验证 common/audiodock_common 工具函数链路通到 entry。
    // fire-and-forget，不阻塞冷启动；失败仅打日志，不影响业务流程。
    this.dumpSelfBundleInfo();

    // 处理桌面小部件拉起的深链（audiodock://widget/...）
    this.handleWidgetDeepLink(want);

    this.loadPage('pages/Index');
  }

  /**
   * 微信支付完成后会通过 scheme `wx42a4102d85be55a1://platformId=wechat` 重新拉起本 Ability。
   * SDK 1.0.10+ 用 openLink 拉起微信，回调通过 onNewWant 触发；必须在这里透传给 SDK。
   */
  onNewWant(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    Logger.i(TAG, `onNewWant uri=${want.uri}`);
    handleWechatWant(want);
    this.handleWidgetDeepLink(want);
  }

  /**
   * 回到前台时重设系统栏/窗口底色。
   * 切后台瞬间系统可能用启动白底生成任务卡片快照（闪白），
   * 回前台重设可确保窗口底色与状态栏颜色始终跟随当前主题。
   */
  onForeground(): void {
    const mode: ThemeMode = AppStorage.get<ThemeMode>('themeMode') ?? 'light';
    applySystemBar(mode);
  }

  onDestroy(): void {
    Logger.i(TAG, 'onDestroy');
    themeAutoStore.stop();
    releaseAVSessionService();
  }

  /**
   * 系统配置变更回调（含系统色 light/dark 切换）。
   * ThemeAutoStore.onSystemColorChanged 内部会校验 autoTheme 开关是否开启，
   * 关闭时自动停止覆盖 themeMode（保留用户手动选择）。
   */
  onConfigurationUpdate(newConfig: Configuration): void {
    Logger.i(TAG, `onConfigurationUpdate colorMode=${newConfig.colorMode}`);
    themeAutoStore.onSystemColorChanged(newConfig.colorMode);
  }

  async onWindowStageCreate(windowStage: window.WindowStage): Promise<void> {
    hilog.info(DOMAIN, TAG, 'onWindowStageCreate');
    // 系统不会等 async onCreate 结束就回调本方法；必须等初始化（语言/主题写入 AppStorage）
    // 完成后再加载页面，否则首帧会用默认中文构建，且 tabBar 等一次性构建的 UI 之后不再刷新。
    if (this.initPromise) await this.initPromise;

    // 先 loadContent 让页面尽快渲染；系统栏设置在 getMainWindow 回调里异步完成。
    // setSystemBarWindow 内部会开启沉浸式（setWindowLayoutFullScreen），
    // 之后 applySystemBar 才能真正改变状态栏/底部小横条区域颜色。
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

    // 服务器地址确定后才能判定内网/外网，封面与头像的分级加载依赖它
    await refreshNetworkMode();

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

    // 恢复车机模式相关状态，供 MainPage / SettingsPage / GlobalBottomBar / SquirrelAgent
    // 通过 @StorageLink 订阅，跨页面联动（对齐 mobile 的 SettingsContext）。
    // carModeEnabled / carPanelsSwapped 用 'true'/'false' 字符串持久化；
    // screenBottomInset 是数字 0–160，用 String() 后再 Number() 解析。
    const carModeRaw = await kvStore.get('carModeEnabled');
    AppStorage.setOrCreate<boolean>('carModeEnabled', carModeRaw === 'true');
    const carPanelsSwappedRaw = await kvStore.get('carPanelsSwapped');
    AppStorage.setOrCreate<boolean>('carPanelsSwapped', carPanelsSwappedRaw === 'true');
    const screenInsetRaw = await kvStore.get('screenBottomInset');
    const inset = screenInsetRaw !== null ? Number(screenInsetRaw) : 0;
    AppStorage.setOrCreate<number>('screenBottomInset', Number.isFinite(inset) ? inset : 0);
    // 自动横竖屏：MainPage.applyOrientation 通过 @StorageLink 订阅，按优先级链决定方向
    const autoOrientRaw = await kvStore.get('autoOrientation');
    AppStorage.setOrCreate<boolean>('autoOrientation', autoOrientRaw === 'true');

    // 自动主题：把 kvStore 的 autoTheme 写入 AppStorage。
    // ThemeAutoStore 通过 EntryAbility.onConfigurationUpdate 回调接收系统色变化，
    // 这比 Web mediaquery 更可靠——是 HarmonyOS 系统级标准回调。
    const autoThemeRaw = await kvStore.get('autoTheme');
    AppStorage.setOrCreate<boolean>('autoTheme', autoThemeRaw === 'true');
    themeAutoStore.init(ctx);
    themeAutoStore.restore();

    // 恢复登录态（user/token），桌面小部件 syncVip 依赖 authStore.state_.user?.id，
    // 没这一步 syncVip 会因为 user=null 把 KV 写成 isVip=false，导致卡片被误锁定。
    await authStore.loadFromStorage();

    Logger.i(TAG, 'initialize complete');
  }

  private loadPage(path: string): void {
    hilog.info(DOMAIN, TAG, `would navigate to ${path}`);
  }

  /**
   * 接口落点探测：从 audiodock_common 调用 bundleManager.getBundleInfoForSelf 并打印摘要。
   * 仅 debug 阶段使用，提交前可注释或加 release 开关。
   */
  private dumpSelfBundleInfo(): void {
    getSelfAppVersion()
      .then((v) => {
        Logger.i(TAG, `[bundleInfo] version=${v.versionName} (code=${v.versionCode})`);
      })
      .catch((e: Error) => Logger.w(TAG, `[bundleInfo] version failed: ${e.message}`));

    getSelfBundleInfo()
      .then((info: bundleManager.BundleInfo) => {
        const summary: BundleInfoSummary = {
          name: info.name,
          versionName: info.versionName,
          versionCode: info.versionCode,
          hapModules: (info.hapModulesInfo ?? []).map((m: bundleManager.HapModuleInfo) => m.name),
          permissions: (info.reqPermissionDetails ?? []).map((p: bundleManager.ReqPermissionDetail) => p.name),
          appId: info.appInfo?.name,
          hasSignature: !!info.signatureInfo?.fingerprint,
        };
        Logger.i(TAG, `[bundleInfo] full=${JSON.stringify(summary)}`);
        // 应用签名证书的 SHA-256 指纹（微信开放平台「应用签名」要填的就是它，去掉冒号转大写）
        Logger.i(TAG, `[bundleInfo] signFingerprint=${JSON.stringify(info.signatureInfo?.fingerprint ?? 'NONE')}`);
      })
      .catch((e: Error) => Logger.w(TAG, `[bundleInfo] full failed: ${e.message}`));
  }

  /**
   * 处理桌面小部件拉起的深链：audiodock://widget/<path>
   * - member-benefits → MemberBenefitsPage
   * - player → MainPage（播放页路由由 RootShellPage 处理）
   * - method=<action>&id=<id> → widgetCommandHandler.handle 转发到 playerStore/likesHistory
   */
  private handleWidgetDeepLink(want: Want): void {
    const uri = want.uri;
    if (!uri) return;
    if (!uri.startsWith('audiodock://')) return;
    Logger.i(TAG, `widget deepLink: ${uri}`);
    // card 点击 url 是 audiodock://widget?method=play 这种带 params 的形式（postCardAction router+params）
    const params = (want.parameters as Record<string, Object>) ?? {};
    const methodVal = String(params['method'] ?? '');
    if (methodVal !== '') {
      const payload: Record<string, string> = {};
      payload['id'] = String(params['id'] ?? '');
      widgetCommandHandler.handle({
        action: methodVal,
        payload,
      }).catch((e: Error): void => {
        Logger.w(TAG, `widget command: ${e.message}`);
      });
      return;
    }
    // 直接 URL 形式：audiodock://widget/member-benefits（暂只用来跳会员页）
    const path = uri.replace('audiodock://', '');
    if (path.includes('member-benefits')) {
      try {
        router.pushUrl({ url: 'pages/MemberBenefitsPage' }).catch((): void => undefined);
      } catch (e) { /* swallow */ }
    }
  }
}
