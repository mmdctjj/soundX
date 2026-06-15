import { request } from "./request";

export interface MiDevice {
  device_id: string;
  name: string;
  model: string;
}

export interface MiDevicesResponse {
  devices: MiDevice[];
}

export interface MiAuthStatusResponse {
  success: boolean;
  logged_in: boolean;
  message?: string;
}

export interface MiPlayByUrlRequest {
  device_id: string;
  url: string;
  title?: string;
}

export interface MiPlayByUrlResponse {
  success: boolean;
  title: string;
}

const MI_BASE_URL = "/mi";

/**
 * 获取小爱音箱设备列表
 * 通过 /mi 前缀由后端代理到 mi 服务
 */
export const getMiDevices = async (): Promise<MiDevicesResponse> => {
  return request.get<MiDevicesResponse>(`${MI_BASE_URL}/api/devices`);
};

/**
 * 检查小米账号登录状态
 */
export const getMiAuthStatus = async (): Promise<MiAuthStatusResponse> => {
  return request.get<MiAuthStatusResponse>(`${MI_BASE_URL}/api/auth/status`);
};

/**
 * 通过 URL 把当前播放的歌曲推送到小爱音箱
 * desktop 端构造 track 流地址后调用此接口
 */
export const playMiDeviceByUrl = async (
  payload: MiPlayByUrlRequest,
): Promise<MiPlayByUrlResponse> => {
  return request.post<MiPlayByUrlResponse>(
    `${MI_BASE_URL}/api/play_by_url`,
    null,
    { params: payload },
  );
};
