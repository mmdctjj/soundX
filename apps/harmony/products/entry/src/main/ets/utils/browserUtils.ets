import { common, Want } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { Logger } from 'audiodock_common';

/** AudioDock 鸿蒙应用 bundleName（与 AppScope/app.json5 一致） */
const AUDIODOCK_BUNDLE_NAME: string = 'com.audiodock.app';
/** 华为 AppGallery 的 bundleName（HarmonyOS 设备主要走它） */
const HUAWEI_APP_GALLERY_BUNDLE: string = 'com.huawei.appmarket';

/**
 * 用系统默认浏览器打开外部链接（等价于 mobile 端的 Linking.openURL）。
 */
export function openInBrowser(context: common.Context, url: string): void {
  const want: Want = {
    action: 'ohos.want.action.viewData',
    uri: url,
  };
  (context as common.UIAbilityContext).startAbility(want).catch((err: BusinessError) => {
    Logger.w('BrowserUtils', `open url failed: ${JSON.stringify(err)}`);
  });
}

/**
 * 调起应用市场跳转到本应用详情页（等价于 mobile 端 openStoreDebug / Android
 * `market://details?id=` 的思路，鸿蒙走 startAbility 拉起华为 AppGallery）。
 *
 * 方案：
 *   1. 优先 `appmarket://` scheme + bundleName 直接拉起 AppGallery
 *   2. 失败 → 兜底 `ohos.want.action.viewData` 打开 AppGallery web URL，
 *      让系统根据已注册的 deep link 路由
 *   3. 全失败 → 打日志，不抛异常
 *
 * 用于更新弹窗「去更新」按钮 / 个人页「去应用商店评价」入口。
 */
export function jumpToAppMarket(context: common.Context): void {
  const ctx: common.UIAbilityContext = context as common.UIAbilityContext;

  // 方案 1：appmarket:// scheme + AppGallery bundleName
  try {
    const want: Want = {
      bundleName: HUAWEI_APP_GALLERY_BUNDLE,
      uri: `appmarket://${AUDIODOCK_BUNDLE_NAME}`,
    };
    ctx.startAbility(want).then((): void => {
      Logger.i('BrowserUtils', 'jumpToAppMarket: scheme 拉起成功');
    }).catch((err: BusinessError): void => {
      Logger.w('BrowserUtils', `appmarket scheme 失败，回退 web URL: ${JSON.stringify(err)}`);
      jumpToAppMarketWeb(ctx);
    });
  } catch (e) {
    Logger.w('BrowserUtils', `appmarket scheme 异常，回退 web URL: ${String(e)}`);
    jumpToAppMarketWeb(ctx);
  }
}

/**
 * 兜底方案：通过 viewData action 打开 AppGallery web 详情页。
 * 应用上架后替换 appId 为真实值。
 */
function jumpToAppMarketWeb(ctx: common.UIAbilityContext): void {
  const want: Want = {
    action: 'ohos.want.action.viewData',
    uri: 'https://appgallery.huawei.com/app/C_PLACEHOLDER',
  };
  ctx.startAbility(want).then((): void => {
    Logger.i('BrowserUtils', 'jumpToAppMarket: web URL 拉起成功');
  }).catch((err: BusinessError): void => {
    Logger.e('BrowserUtils', `jumpToAppMarket: 全部失败: ${JSON.stringify(err)}`);
  });
}
