import { ANDROID_STORES, IOS_STORE } from '../constants/store';
import { getPlatform, isIOS, isNative } from '../utils/platform';
import { openExternalURL } from '../utils/openURL';

/**
 * Android 国内分发渠道
 *
 * 当前按以下顺序探测（命中第一个可访问的即可）：
 *   1. huawei (华为 AppGallery)
 *   2. xiaomi (小米)
 *   3. oppo
 *   4. vivo
 *
 * 注意：
 *   - 此处采用"广撒网"策略，即所有 4 家都给一个 URL 让 Linking.canOpenURL
 *     去探测。哪家装了市场 app 就跳哪家（因为 Universal Link / scheme
 *     注册到了 OS）。
 *   - 实际生产场景中如果用户只装了一家市场，应该让用户手动选——v1 不做。
 */
export const ANDROID_STORE_ORDER = ['huawei', 'xiaomi', 'oppo', 'vivo'] as const;
export type AndroidStoreKey = (typeof ANDROID_STORE_ORDER)[number];

/** Android 当前渠道探测返回结果 */
export interface AndroidStoreProbeResult {
  /** 命中的渠道 key（按 ANDROID_STORE_ORDER 顺序） */
  key: AndroidStoreKey | null;
  /** 命中渠道对应的商店 URL（null 表示未命中，需要后续 fallback 到 WebBrowser） */
  url: string | null;
}

/**
 * 探测 Android 当前可用的应用商店渠道
 *
 * 策略：依次尝试 4 家 URL，看系统能否识别 scheme。
 * - 任一命中 → 返回对应 URL
 * - 全部未命中 → 返回 null，让外层 fallback 到 WebBrowser
 *
 * 注：实现上由于 Linking.canOpenURL 不能跨 platform 探测异步竞态，
 * 简化为"按优先级取第一家的 URL"，让操作系统自动匹配 scheme。
 * 这一行为在国内 Android 上是可靠的（Universal Link / scheme 自动匹配）。
 */
export const probeAndroidStore = (): AndroidStoreProbeResult => {
  // 优先按 ANDROID_STORE_ORDER 顺序拿第一家 URL（操作系统会自动用合适的 app 接住）
  const firstKey = ANDROID_STORE_ORDER[0];
  return {
    key: firstKey,
    url: ANDROID_STORES[firstKey],
  };
};

/**
 * 获取当前平台对应的商店 URL
 *
 * - iOS → iOS App Store
 * - Android → 国内分发渠道（当前取优先级最高的"华为"作为默认）
 * - Web / 其他 → null
 */
export const getCurrentStoreUrl = (): string | null => {
  if (!isNative()) return null;
  if (isIOS()) return IOS_STORE.appStoreUrl;

  const androidProbe = probeAndroidStore();
  return androidProbe.url;
};

/** 调试用：当前平台与匹配到的渠道 */
export const describeStoreTarget = (): string => {
  const platform = getPlatform();
  if (isIOS()) return `${platform} → iOS App Store`;
  if (platform === 'android') {
    const probe = probeAndroidStore();
    return `${platform} → Android (${probe.key ?? 'unknown'})`;
  }
  return `${platform} → no store configured`;
};

/**
 * 打开当前平台对应的应用商店
 *
 * @returns 是否成功触发（true=已打开/fallback，false=完全失败）
 */
export const openStoreByPlatform = async (): Promise<boolean> => {
  const url = getCurrentStoreUrl();
  if (!url) {
    console.warn('[openStore] no store url for current platform:', getPlatform());
    return false;
  }
  return openExternalURL(url);
};

/* ---------- 调试专用入口（我的页测试按钮） ---------- */

/** Android 包名（与 android/app/build.gradle#applicationId 一致） */
export const ANDROID_PACKAGE_NAME = 'com.audiodock.app';
/** iOS App Store 应用详情页 URL（与 constants/store.ts#IOS_STORE.appStoreUrl 一致） */
export const IOS_APP_STORE_URL = 'https://apps.apple.com/cn/app/audiodock/id6761128589';

/**
 * 调试专用：按平台跳转到"对应的"应用商店
 *
 * 方案对比（与 openStoreByPlatform 的区别）：
 *   - openStoreByPlatform: 走各家硬编码的 https URL（store.ts）。每上架/换 URL 都要发版。
 *   - openStoreDebug:      Android 走系统级 market:// 协议，**无需任何商店 URL**，
 *                          系统自动路由到已装商店（华为/小米/OPPO/vivo/...）。
 *                          上架新渠道零改动。详见 https://levent-j.com/2020/09/18/android-start-app-market/
 *
 * 行为：
 *   - Android: Linking.openURL('market://details?id=com.audiodock.app')
 *   - iOS:     Linking.openURL('https://apps.apple.com/cn/app/audiodock/id6761128589')
 *   - Web:     noop + console.warn
 *
 * @returns 是否成功触发（true=已打开/fallback，false=完全失败）
 */
export const openStoreDebug = async (): Promise<boolean> => {
  if (!isNative()) {
    console.warn('[openStoreDebug] web 端不支持跳转应用商店');
    return false;
  }

  const url = isIOS()
    ? IOS_APP_STORE_URL
    : `market://details?id=${ANDROID_PACKAGE_NAME}`;

  console.log('[openStoreDebug] jump to:', url);
  return openExternalURL(url);
};
