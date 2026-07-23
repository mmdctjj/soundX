import Constants from 'expo-constants';
import { Platform } from 'react-native';
// iOS 通过 App Store 更新，无需 APK 下载；只在 Android 上加载原生下载模块
// （SystemDownloadManager 仅注册了 android 平台，iOS 上 requireNativeModule 会抛错）
const SystemDownloadManager =
  Platform.OS === 'android'
    ? require('../../modules/system-download-manager').default
    : null;

/**
 * 1. 获取本地版本号 (例如 "1.0.58")
 */
export const getLocalVersion = () => {
  // Expo 推荐使用 expoConfig，兼容旧版本用 manifest
  return Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';
};

/**
 * 2. 版本比对算法
 * 返回 1: remote > local (需要更新)
 * 返回 0: 相等
 * 返回 -1: remote < local
 */
export const compareVersions = (remote: string, local: string): number => {
  const parts1 = remote.split('.').map(Number);
  const parts2 = local.split('.').map(Number);
  const length = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < length; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
};

export const downloadAndInstallApk = async (
  downloadUrl: string,
  onProgress: (progress: number) => void
) => {
  if (Platform.OS !== 'android') return;

  onProgress(0.05);

  try {
    await SystemDownloadManager!.downloadApk(downloadUrl);
    onProgress(1);
  } catch (e) {
    console.error('创建系统下载任务失败:', e);
    throw e;
  }
};
