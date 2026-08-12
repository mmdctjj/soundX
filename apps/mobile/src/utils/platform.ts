import { Platform } from 'react-native';

/**
 * 平台判断统一封装
 *
 * 项目内禁止直接使用 `Platform.OS === 'xxx'`，一律通过本文件导出的
 * `isIOS` / `isAndroid` / `isWeb`，便于：
 *   1. 集中后续扩展（如 `isHarmony` / `isPad` 等）
 *   2. TypeScript 友好（避免到处写裸字符串）
 *   3. 后续如果引入 `expo-application` / `Device.osName` 可以一处替换
 */

export const isIOS = (): boolean => Platform.OS === 'ios';

export const isAndroid = (): boolean => Platform.OS === 'android';

export const isWeb = (): boolean => Platform.OS === 'web';

/**
 * 当前平台标识（用于版本检查 / 商店路由等业务分支判断）。
 *
 * 返回值与 React Native 的 `Platform.OS` 一致。
 */
export const getPlatform = (): 'ios' | 'android' | 'web' | (typeof Platform.OS extends string ? typeof Platform.OS : never) => {
  return Platform.OS;
};

/**
 * 是否原生环境（iOS / Android）。Web 端不算原生。
 */
export const isNative = (): boolean => isIOS() || isAndroid();

// 预留：未来如果支持 HarmonyOS React Native 包，可启用
// export const isHarmony = (): boolean => Platform.OS === 'harmony' || Platform.OS === 'openharmony';
