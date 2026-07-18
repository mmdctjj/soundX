import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { plusRequest, ISuccessResponse } from '@soundx/services';
import { compareVersions, downloadAndInstallApk, getLocalVersion } from '../src/utils/updateUtils';

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

  const checkUpdate = async () => {
    if (Platform.OS !== 'android') return;

    try {
      const response = await plusRequest.get<ISuccessResponse<DownloadLatestData>>(
        '/download/latest',
        { params: { product: 'audiodock' } }
      );
      const result = response.data;

      if (result.code !== 200 || !result.data) {
        console.log('检查更新接口返回异常:', result);
        return;
      }

      const { version: remoteVersion, files } = result.data;
      if (!remoteVersion) return;

      const localVersion = getLocalVersion();
      console.log(`本地: ${localVersion}, 线上: ${remoteVersion}`);

      const ignoredVersion = await AsyncStorage.getItem("ignored_version");
      if (remoteVersion === ignoredVersion) {
        console.log(`Version ${remoteVersion} is ignored.`);
        return;
      }

      if (compareVersions(remoteVersion, localVersion) === 1) {
        const apkAsset = files.find((a) => a.platform === 'android');

        if (!apkAsset) {
          console.log(`Version ${remoteVersion} found but no Android APK found.`);
          return;
        }

        console.log(`Found Android APK: ${apkAsset.url}`);

        setUpdateInfo({
          version: remoteVersion,
          body: `${apkAsset.label} ${apkAsset.filename}`,
          downloadUrl: apkAsset.url
        });

        setProgress(0);
      }
    } catch (error) {
      console.error('检查更新失败', error);
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
