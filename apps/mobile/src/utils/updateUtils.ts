import Constants from 'expo-constants';

/**
 * 获取本地版本号 (例如 "1.0.58")
 */
export const getLocalVersion = () => {
  // Expo 推荐使用 expoConfig，兼容旧版本用 manifest
  return Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';
};
