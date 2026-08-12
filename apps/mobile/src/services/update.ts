import { plusRequest, ISuccessResponse } from '@soundx/services';
import type { AxiosResponse } from 'axios';

/**
 * 后端 /download/latest 接口返回结构
 *
 * 当前只读取 `version` 字段做版本比较。
 * `files` 字段保留以便未来扩展：
 *   - 若服务端下发 stores 字段，可通过 service 层转换后下发给 UI
 *   - 若只下发 APK 文件，可走原生下载（v2 范围，本次不做）
 */
export interface DownloadFileInfo {
  platform: string;
  label: string;
  filename: string;
  size: number;
  url: string;
}

export interface DownloadLatestData {
  version: string;
  files?: DownloadFileInfo[];
}

/** 业务层返回的精简结构（UI / hook 只关心这些字段） */
export interface LatestVersionResult {
  /** 远端版本号（如 "1.3.0"），null 表示接口异常 */
  version: string | null;
}

/**
 * 调用后端 plus 服务拉取最新版本号
 *
 * @param product 服务端约定的产品标识（当前 AudioDock 传 "audiodock"）
 * @returns 远端版本号；接口异常时返回 `{ version: null }`，调用方据此决定
 *          是否弹窗（应静默失败，不打扰用户）
 */
export const getLatestVersion = async (
  product: string = 'audiodock',
): Promise<LatestVersionResult> => {
  try {
    const response = await plusRequest.get<
      ISuccessResponse<DownloadLatestData>
    >('/download/latest', { params: { product } });
    const body = response.data;

    if (body?.code !== 200 || !body?.data) {
      console.log('[update] /download/latest 返回异常:', body);
      return { version: null };
    }

    const remoteVersion = body.data.version;
    if (!remoteVersion) {
      return { version: null };
    }
    return { version: remoteVersion };
  } catch (e) {
    // 网络异常 / 401 / 5xx：全部静默，UI 不弹窗
    console.warn('[update] /download/latest 请求失败:', e);
    return { version: null };
  }
};

// 显式 re-export AxiosResponse 以便调用方在 mock 场景引用
export type { AxiosResponse };
