import { httpClient } from '../HarmonyHttpClient';

/**
 * 小爱音箱（XiaoAi Speaker）相关接口。
 * 字段与返回结构对齐 packages/services/src/mi.ts（mobile/desktop 共用）。
 * 后端通过 `/mi` 前缀代理到 mi 服务。
 */
export interface MiDevice {
  device_id: string;
  name: string;
  model?: string;
}

export interface MiDevicesResponse {
  devices: MiDevice[];
}

export interface MiAuthStatusResponse {
  success: boolean;
  logged_in: boolean;
  message?: string;
}

export interface MiQRCodeResponse {
  success: boolean;
  already_logged_in: boolean;
  qrcode_url: string;
  login_url?: string;
  status_url?: string;
  expire_seconds: number;
  message?: string;
}

export interface MiQRCodeStatusResponse {
  success: boolean;
  status: 'pending' | 'success' | 'expired' | 'error';
  message?: string;
  user_id?: string;
}

export interface MiPlayByUrlResponse {
  success: boolean;
  title: string;
}

export interface MiApi {
  /** 检查小米账号登录状态 */
  getAuthStatus(): Promise<MiAuthStatusResponse>;
  /** 获取小爱音箱设备列表 */
  getDevices(): Promise<MiDevicesResponse>;
  /** 获取小米账号扫码登录二维码 */
  getQRCode(): Promise<MiQRCodeResponse>;
  /** 查询扫码登录状态，lpUrl 来自 getQRCode 返回的 status_url */
  getQRCodeStatus(lpUrl: string): Promise<MiQRCodeStatusResponse>;
  /** 通过 URL 把歌曲推送到小爱音箱（参数走 query，对齐 mobile playMiDeviceByUrl） */
  playByUrl(deviceId: string, url: string, title?: string): Promise<MiPlayByUrlResponse>;
}

class MiApiImpl implements MiApi {
  async getAuthStatus(): Promise<MiAuthStatusResponse> {
    return httpClient.get<MiAuthStatusResponse>('/mi/api/auth/status');
  }

  async getDevices(): Promise<MiDevicesResponse> {
    return httpClient.get<MiDevicesResponse>('/mi/api/devices');
  }

  async getQRCode(): Promise<MiQRCodeResponse> {
    return httpClient.get<MiQRCodeResponse>('/mi/api/auth/qrcode');
  }

  async getQRCodeStatus(lpUrl: string): Promise<MiQRCodeStatusResponse> {
    const q: Record<string, string | number | boolean> = {};
    q['lp_url'] = lpUrl;
    return httpClient.get<MiQRCodeStatusResponse>('/mi/api/auth/qrcode_status', q);
  }

  async playByUrl(deviceId: string, url: string, title?: string): Promise<MiPlayByUrlResponse> {
    const q: Record<string, string | number | boolean> = {};
    q['device_id'] = deviceId;
    q['url'] = url;
    if (title !== undefined) q['title'] = title;
    // mobile 端 playMiDeviceByUrl 把参数放在 query 上（request.post(url, null, { params })）
    return httpClient.request<MiPlayByUrlResponse>({ method: 'POST', url: '/mi/api/play_by_url', params: q });
  }
}

export const miApi: MiApi = new MiApiImpl();
