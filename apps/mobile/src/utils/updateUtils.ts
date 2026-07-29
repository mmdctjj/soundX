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
 * 2. 版本比对算法（semver，支持预发布版本如 1.2.3-beta.1）
 * 返回 1: remote > local (需要更新)
 * 返回 0: 相等
 * 返回 -1: remote < local
 *
 * 规则：主版本号逐段比较；相同时有 prerelease 的一方更小
 * （1.2.3-beta.1 < 1.2.3），两边都有 prerelease 则逐段比较标识符，
 * 数字段按数值比，非数字段按字典序，数字段小于非数字段。
 */
export const compareVersions = (remote: string, local: string): number => {
  const [core1, pre1] = splitVersion(remote);
  const [core2, pre2] = splitVersion(local);

  for (let i = 0; i < 3; i++) {
    const num1 = core1[i] || 0;
    const num2 = core2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  // core 相同：无 prerelease 的一方更大
  if (!pre1.length && !pre2.length) return 0;
  if (!pre1.length) return 1;
  if (!pre2.length) return -1;

  for (let i = 0; i < Math.max(pre1.length, pre2.length); i++) {
    const a = pre1[i];
    const b = pre2[i];
    // 段数少的一方更小（beta.1 < beta.1.1）
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    const numA = /^\d+$/.test(a) ? Number(a) : null;
    const numB = /^\d+$/.test(b) ? Number(b) : null;
    if (numA !== null && numB !== null) {
      if (numA !== numB) return numA > numB ? 1 : -1;
    } else if (numA !== null) {
      return -1; // 数字段 < 非数字段
    } else if (numB !== null) {
      return 1;
    } else if (a !== b) {
      return a > b ? 1 : -1;
    }
  }
  return 0;
};

const splitVersion = (v: string): [number[], string[]] => {
  // 丢弃 build metadata（+ 之后的部分），不参与优先级比较
  const withoutBuild = v.split('+')[0];
  const dash = withoutBuild.indexOf('-');
  const core = dash === -1 ? withoutBuild : withoutBuild.slice(0, dash);
  const pre = dash === -1 ? '' : withoutBuild.slice(dash + 1);
  return [
    core.split('.').map((n) => Number(n) || 0),
    pre ? pre.split('.') : [],
  ];
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
