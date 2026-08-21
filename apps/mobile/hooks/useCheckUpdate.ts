import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { getLatestVersion } from '../src/services/update';
import type { DownloadFileInfo } from '../src/services/update';
import { getCurrentStoreUrl, openStoreByPlatform } from '../src/services/openStore';
import {
  compareVersions,
  downloadAndInstallApk,
  getLocalVersion,
} from '../src/utils/updateUtils';
import { isNative, isXiaomiDevice } from '../src/utils/platform';

/** 配置常量：GitHub 仓库（用于拉取 release changelog） */
const GITHUB_USER = 'mmdctjj';
const GITHUB_REPO = 'AudioDock';
/** AsyncStorage key：用户主动忽略的版本号（同一版本不再弹窗） */
const IGNORED_VERSION_KEY = 'ignored_version';

/**
 * 版本更新信息（弹窗 / 手动检查返回值）
 */
export interface UpdateInfo {
  /** 远端版本号（如 "1.3.0"） */
  version: string;
  /** 更新说明（GitHub Release body markdown） */
  body: string;
  /**
   * 更新方式：
   * - xiaomi：小米设备，走「国内仓库 APK 直装」（downloadUrl 非空）
   * - store：其他平台（iOS / OPPO / vivo / 荣耀…），跳应用商店（storeUrl 非空）
   */
  mode: 'xiaomi' | 'store';
  /** 商店 URL（mode=store 时使用） */
  storeUrl?: string;
  /** APK 直装 URL（mode=xiaomi 时使用，来自后端 /download/latest files） */
  downloadUrl?: string;
}

/** Hook 内部状态 */
interface UseCheckUpdateState {
  /** 是否正在检查中（用于按钮 loading 态） */
  checking: boolean;
  /** 是否正在跳转商店 / 创建下载任务 */
  opening: boolean;
  /** APK 下载进度（0~1，仅 mode=xiaomi 且下载中时有意义） */
  progress: number;
  /** 发现的更新信息（null = 当前已是最新 / 已忽略 / 接口异常） */
  updateInfo: UpdateInfo | null;
}

/**
 * 版本检查 Hook
 *
 * 更新方式按设备品牌分流：
 *   - 小米 / 红米（isXiaomiDevice）→ 国内仓库 APK 直装
 *     （从后端 /download/latest files 中取 platform=android 的 url）
 *   - 其他平台（iOS / OPPO / vivo / 荣耀…）→ 跳转应用商店
 *
 * 用法：
 *   const { checking, updateInfo, checkUpdate, startUpdate, ignoreUpdate } =
 *     useCheckUpdate();
 *
 *   // 启动时静默检查
 *   useEffect(() => { void checkUpdate(); }, []);
 *
 *   // 手动触发（设置页按钮）
 *   const onPress = async () => {
 *     const info = await checkUpdate();
 *     if (!info) Alert.alert(t('update.upToDate')); // "已是最新版本"
 *   };
 *
 *   // 弹窗按钮
 *   <UpdateModal
 *     visible={!!updateInfo}
 *     updateInfo={updateInfo}
 *     onUpdate={startUpdate}
 *     onIgnore={ignoreUpdate}
 *     onCancel={cancelUpdate}
 *   />
 */
export const useCheckUpdate = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<UseCheckUpdateState>({
    checking: false,
    opening: false,
    progress: 0,
    updateInfo: null,
  });

  /**
   * 拉取 GitHub Release body 作为更新说明
   * 失败时 fallback 到一段默认文案
   */
  const fetchReleaseBody = async (version: string): Promise<string> => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/tags/v${version}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      if (data?.body) return data.body;
    } catch (e) {
      console.warn('[useCheckUpdate] fetch github release body failed:', e);
    }
    return t('update.defaultReleaseNotes');
  };

  /**
   * 从后端下发的 files 中取 Android APK 直装地址（小米用）
   */
  const pickAndroidApkUrl = (files: DownloadFileInfo[] | null): string | null => {
    const apk = files?.find((f) => f.platform === 'android');
    return apk?.url || null;
  };

  /**
   * 执行一次版本检查
   *
   * @returns 发现的 UpdateInfo，若无需更新/已忽略/接口异常则返回 null
   */
  const checkUpdate = useCallback(async (): Promise<UpdateInfo | null> => {
    // Web 端不支持跳转商店 / APK 直装，直接跳过
    if (!isNative()) return null;

    setState((s) => ({ ...s, checking: true }));
    try {
      // 1. 调后端拿远端版本 + 文件列表
      const { version: remoteVersion, files } = await getLatestVersion();
      if (!remoteVersion) return null;

      // 2. 检查是否被用户忽略
      const ignored = await AsyncStorage.getItem(IGNORED_VERSION_KEY);
      if (remoteVersion === ignored) {
        console.log(`[useCheckUpdate] version ${remoteVersion} is ignored`);
        return null;
      }

      // 3. 比较版本号
      const localVersion = getLocalVersion();
      console.log(`[useCheckUpdate] local=${localVersion} remote=${remoteVersion}`);
      if (compareVersions(remoteVersion, localVersion) !== 1) {
        return null;
      }

      // 4. 拉 changelog
      const body = await fetchReleaseBody(remoteVersion);

      // 5. 按设备品牌分流更新方式
      const info: UpdateInfo = { version: remoteVersion, body, mode: 'store' };

      if (isXiaomiDevice()) {
        // 小米 / 红米：走国内仓库 APK 直装
        const downloadUrl = pickAndroidApkUrl(files);
        if (!downloadUrl) {
          console.warn('[useCheckUpdate] 小米设备但未下发 APK 下载地址');
          return null;
        }
        info.mode = 'xiaomi';
        info.downloadUrl = downloadUrl;
      } else {
        // 其他平台（iOS / OPPO / vivo / 荣耀…）：跳应用商店
        const storeUrl = getCurrentStoreUrl();
        if (!storeUrl) {
          console.warn('[useCheckUpdate] no store url for current platform');
          return null;
        }
        info.storeUrl = storeUrl;
      }

      setState((s) => ({ ...s, updateInfo: info }));
      return info;
    } catch (e) {
      console.warn('[useCheckUpdate] checkUpdate error:', e);
      return null;
    } finally {
      setState((s) => ({ ...s, checking: false }));
    }
  }, []);

  /**
   * 执行更新（用户点击「立即更新」时调用）
   *
   * - 小米：调原生系统下载器下载 APK，下载完成后自动拉起安装
   * - 其他：打开应用商店
   */
  const startUpdate = useCallback(async () => {
    setState((s) => ({ ...s, opening: true }));
    try {
      if (state.updateInfo?.mode === 'xiaomi' && state.updateInfo.downloadUrl) {
        await downloadAndInstallApk(state.updateInfo.downloadUrl, (p) => {
          setState((s) => ({ ...s, progress: p }));
        });
      } else {
        const ok = await openStoreByPlatform();
        if (!ok) {
          Alert.alert(t('update.openStoreFailedTitle'), t('update.openStoreFailedBody'));
        }
      }
    } catch (e) {
      console.warn('[useCheckUpdate] startUpdate error:', e);
      Alert.alert(t('update.openStoreFailedTitle'), t('update.openStoreFailedBody'));
    } finally {
      setState((s) => ({ ...s, opening: false }));
    }
  }, [state.updateInfo, t]);

  /**
   * 忽略当前版本（写入 AsyncStorage）
   */
  const ignoreUpdate = useCallback(async () => {
    if (state.updateInfo) {
      await AsyncStorage.setItem(IGNORED_VERSION_KEY, state.updateInfo.version);
    }
    setState((s) => ({ ...s, updateInfo: null, progress: 0 }));
  }, [state.updateInfo]);

  /**
   * 关闭弹窗（不忽略，下次启动仍会再询问）
   */
  const cancelUpdate = useCallback(() => {
    setState((s) => ({ ...s, updateInfo: null, progress: 0 }));
  }, []);

  return {
    checking: state.checking,
    opening: state.opening,
    progress: state.progress,
    updateInfo: state.updateInfo,
    checkUpdate,
    startUpdate,
    ignoreUpdate,
    cancelUpdate,
  };
};
