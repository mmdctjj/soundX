import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

/**
 * 统一打开外部链接
 *
 * 行为：
 *   1. 先 `Linking.canOpenURL(url)` 探测系统是否支持该 scheme
 *   2. 不支持 → fallback `WebBrowser.openBrowserAsync(url)`（系统浏览器）
 *   3. 支持 → `Linking.openURL(url)`
 *   4. 全失败 → `console.warn` 兜底，不抛异常（避免阻塞 UI）
 *
 * 注意：
 *   - 在 iOS 上，App Store / Universal Link 会被系统自动拦截跳转到对应 app，
 *     无需特殊 scheme 处理。
 *   - 浏览器兜底用于：当系统未安装目标 app（如未安装华为市场）时，自动打开
 *     浏览器展示网页版详情页，避免用户看到「无法打开链接」的报错。
 *
 * @param url 要打开的 URL
 * @returns 是否成功触发（true=已打开，false=已 fallback 或失败）
 */
export const openExternalURL = async (url: string): Promise<boolean> => {
  if (!url) {
    console.warn('[openExternalURL] url is empty');
    return false;
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    }
  } catch (e) {
    console.warn('[openExternalURL] Linking.canOpenURL/openURL failed:', e);
  }

  // 兜底：用系统浏览器打开
  try {
    await WebBrowser.openBrowserAsync(url, {
      dismissButtonStyle: 'close',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
    return true;
  } catch (e) {
    console.warn('[openExternalURL] WebBrowser.openBrowserAsync fallback failed:', e);
    return false;
  }
};
