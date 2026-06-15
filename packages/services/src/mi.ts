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
