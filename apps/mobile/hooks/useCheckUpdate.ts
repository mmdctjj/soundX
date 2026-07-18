import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { plusRequest, ISuccessResponse } from '@soundx/services';
import { compareVersions, downloadAndInstallApk, getLocalVersion } from '../src/utils/updateUtils';
// 配置常量
const GITHUB_USER = 'mmdctjj';
const GITHUB_REPO = 'AudioDock';

export interface UpdateInfo {
  version: string;
  body: string;
  downloadUrl: string;
}

interface DownloadFileInfo {
  platform: string;
  label: string;
  filename: string;
  size: number;
  url: string;
}

interface DownloadLatestData {
  version: string;
  files: DownloadFileInfo[];
}

export const useCheckUpdate = () => {
  const [progress, setProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const checkUpdate = async (): Promise<UpdateInfo | null> => {
    if (Platform.OS !== 'android') return null;

    try {
      const response = await plusRequest.get<ISuccessResponse<DownloadLatestData>>(
        '/download/latest',
        { params: { product: 'audiodock' } }
      );
      const result = response.data;

      if (result.code !== 200 || !result.data) {
        console.log('检查更新接口返回异常:', result);
        return null;
      }

      const { version: remoteVersion, files } = result.data;
      if (!remoteVersion) return null;

      const localVersion = getLocalVersion();
      console.log(`本地: ${localVersion}, 线上: ${remoteVersion}`);

      const ignoredVersion = await AsyncStorage.getItem("ignored_version");
      if (remoteVersion === ignoredVersion) {
        console.log(`Version ${remoteVersion} is ignored.`);
        return null;
      }

      if (compareVersions(remoteVersion, localVersion) === 1) {
        const apkAsset = files.find((a) => a.platform === 'android');

        if (!apkAsset) {
          console.log(`Version ${remoteVersion} found but no Android APK found.`);
          return null;
        }

        console.log(`Found Android APK: ${apkAsset.url}`);

        // 从 GitHub release 获取更新说明
        let releaseBody = '建议立即更新体验新功能';
        try {
          const githubRes = await fetch(
            `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/tags/v${remoteVersion}`
          );
          const githubData = await githubRes.json();
          if (githubData?.body) {
            releaseBody = githubData.body;
          }
        } catch (e) {
          console.log('获取 GitHub release 说明失败:', e);
        }

        const info: UpdateInfo = {
          version: remoteVersion,
          body: releaseBody,
          downloadUrl: apkAsset.url
        };

        setUpdateInfo(info);
        setProgress(0);
        return info;
      }

      return null;
    } catch (error) {
      console.error('检查更新失败', error);
      return null;
    }
  };

  const startUpdate = () => {
    if (isUpdating) return;
    if (updateInfo) {
      startDownload(updateInfo.downloadUrl);
    }
  };

  const ignoreUpdate = async () => {
    if (updateInfo) {
      await AsyncStorage.setItem("ignored_version", updateInfo.version);
      setUpdateInfo(null);
    }
  };

  const cancelUpdate = () => {
    setUpdateInfo(null);
  };

  const startDownload = async (url: string) => {
    setIsUpdating(true);
    setProgress(0);

    try {
      await downloadAndInstallApk(url, (p) => {
        setProgress(p);
      });
    } catch (e) {
      Alert.alert('更新失败', '无法创建系统下载任务，请重试');
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    checkUpdate,
    progress,
    isUpdating,
    updateInfo,
    startUpdate,
    ignoreUpdate,
    cancelUpdate,
  };
};
