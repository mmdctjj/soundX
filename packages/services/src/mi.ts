import { request } from "./request";
export interface MiPlayPlaylistRequest {
  device_id: string;
  tracks: { url: string; title: string; duration?: number }[];
  start_index?: number;
}

export interface MiPlayPlaylistResponse {
  success: boolean;
  tracks_count: number;
}

/**
 * 播放播放列表到小爱音箱
 * 从指定索引开始播放，服务端自动切歌
 */
export const playMiDevicePlaylist = async (
  payload: MiPlayPlaylistRequest,
): Promise<MiPlayPlaylistResponse> => {
  return request.post<MiPlayPlaylistResponse>(
    `${MI_BASE_URL}/api/play_playlist`,
    payload.tracks,
    {
      params: {
        device_id: payload.device_id,
        start_index: payload.start_index || 0,
      },
    },
  );
};

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
  status: "pending" | "success" | "expired" | "error";
  message?: string;
  user_id?: string;
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
 * 获取小米账号扫码登录二维码
 */
export const getMiQRCode = async (): Promise<MiQRCodeResponse> => {
  return request.get<MiQRCodeResponse>(`${MI_BASE_URL}/api/auth/qrcode`);
};

/**
 * 查询扫码登录状态
 * @param lpUrl 从 /auth/qrcode 返回的 status_url
 */
export const getMiQRCodeStatus = async (
  lpUrl: string,
): Promise<MiQRCodeStatusResponse> => {
  return request.get<MiQRCodeStatusResponse>(
    `${MI_BASE_URL}/api/auth/qrcode_status`,
    { params: { lp_url: lpUrl } },
  );
};

/**
 * 退出小米账号登录
 */
export const logoutMiAccount = async (): Promise<{ success: boolean; message?: string }> => {
  return request.post(`${MI_BASE_URL}/api/auth/logout`);
};

export interface MiPlayByUrlRequest {
  device_id: string;
  url: string;
  title?: string;
}

export interface MiPlayByUrlResponse {
  success: boolean;
  title: string;
}

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

// ===================== 唤醒关键字管理 =====================

export interface MiKeyword {
  id: number;
  keyword: string;
  enabled: boolean;
  created_at: number;
  updated_at: number;
}

export interface MiKeywordsResponse {
  keywords: MiKeyword[];
}

export const getMiKeywords = async (): Promise<MiKeywordsResponse> => {
  return request.get<MiKeywordsResponse>(`${MI_BASE_URL}/api/keywords`);
};

export const addMiKeyword = async (
  keyword: string,
): Promise<{ keyword: MiKeyword }> => {
  return request.post<{ keyword: MiKeyword }>(`${MI_BASE_URL}/api/keywords`, {
    keyword,
  });
};

export const updateMiKeyword = async (
  id: number,
  patch: { keyword?: string; enabled?: boolean },
): Promise<{ success: boolean }> => {
  return request.put<{ success: boolean }>(
    `${MI_BASE_URL}/api/keywords/${id}`,
    patch,
  );
};

export const deleteMiKeyword = async (
  id: number,
): Promise<{ success: boolean }> => {
  return request.delete<{ success: boolean }>(
    `${MI_BASE_URL}/api/keywords/${id}`,
  );
};

// ===================== 历史记录（分页） =====================

export interface MiPageQuery {
  page?: number;
  size?: number;
  device_id?: string;
  start_ms?: number;
  end_ms?: number;
}

export interface MiConversation {
  id: number;
  device_id: string;
  device_name: string;
  query: string;
  answer: string;
  request_id: string;
  timestamp_ms: number;
  created_at: number;
}

export interface MiCastRecord {
  id: number;
  device_id: string;
  device_name: string;
  title: string;
  url: string;
  source: "play_by_url" | "play_playlist" | "voice";
  tracks_count: number;
  created_at: number;
}

export interface MiPagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export const getMiConversations = async (
  q: MiPageQuery = {},
): Promise<MiPagedResponse<MiConversation>> => {
  return request.get<MiPagedResponse<MiConversation>>(
    `${MI_BASE_URL}/api/conversations`,
    { params: q },
  );
};

export const getMiCasts = async (
  q: MiPageQuery = {},
): Promise<MiPagedResponse<MiCastRecord>> => {
  return request.get<MiPagedResponse<MiCastRecord>>(
    `${MI_BASE_URL}/api/casts`,
    { params: q },
  );
};
