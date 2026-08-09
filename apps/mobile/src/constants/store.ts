/**
 * 跨平台应用商店 URL 配置
 *
 * 本文件集中管理 AudioDock 在各应用商店的下载链接。新增平台只需在此处
 * 添加字段，版本检测 / 跳转逻辑无需改动。
 *
 * ⚠️ Android 各家国内商店 URL 暂为占位（PLACEHOLDER），请替换为真实上架链接后再发布。
 *
 *  - iOS: 已上架 → https://apps.apple.com/cn/app/audiodock/id6761128589
 *  - 华为 AppGallery / 小米 / OPPO / vivo: 暂未上架，使用占位 URL（占位 URL 会在
 *    Linking.canOpenURL 探测阶段失败并 fallback 到 WebBrowser，体验是「打开
 *    浏览器到 404」，不会 crash。正式上架后填入真实 URL 即可）
 */

/** iOS 端配置 */
export const IOS_STORE = {
  /** App Store 应用详情页 URL（公网可访问，无需国家码跳转） */
  appStoreUrl: 'https://apps.apple.com/cn/app/audiodock/id6761128589',
} as const;

/** Android 端配置（国内分发渠道） */
export const ANDROID_STORES = {
  /** 华为应用市场 AppGallery 应用详情页 */
  huawei: 'https://appgallery.huawei.com/app/C_PLACEHOLDER',
  /** 小米应用商店 */
  xiaomi: 'https://app.mi.com/details?id=PLACEHOLDER',
  /** OPPO 软件商店 */
  oppo: 'https://store.oppomobile.com/details?app_id=PLACEHOLDER',
  /** vivo 应用商店 */
  vivo: 'https://h5.vivo.com.cn/wap/vivoShop/detail/C_PLACEHOLDER.html',
} as const;

/**
 * 聚合导出：所有平台商店 URL
 *
 * - iOS 单家（App Store）
 * - Android 国内四家（华为 / 小米 / OPPO / vivo），由调用方根据具体渠道分发场景选择
 */
export const STORES = {
  ios: IOS_STORE,
  android: ANDROID_STORES,
} as const;

/** 仅给开发者参考：用 PLACEHOLDER 占位的字段（用于 CI 检查 / 上架前提醒） */
export const PLACEHOLDER_STORES = (Object.keys(ANDROID_STORES) as Array<keyof typeof ANDROID_STORES>)
  .filter((k) => ANDROID_STORES[k].includes('PLACEHOLDER'));
