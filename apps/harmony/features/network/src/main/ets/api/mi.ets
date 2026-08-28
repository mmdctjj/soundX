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

export interface MiTrackPayload {
  url: string;
  title: string;
  duration?: number;
}

export interface MiPlayPlaylistResponse {
  success: boolean;
  tracks_count: number;
}

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
  source: string;
  tracks_count: number;
  created_at: number;
}

export interface MiPagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface MiSimpleResponse {
  success: boolean;
  message?: string;
}

export interface MiAddKeywordResponse {
  keyword: MiKeyword;
}

export interface MiKeywordPatch {
  keyword?: string;
  enabled?: boolean;
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
  /** 退出小米账号登录 */
  logout(): Promise<MiSimpleResponse>;
  /** 通过 URL 把歌曲推送到小爱音箱（参数走 query，对齐 mobile playMiDeviceByUrl） */
  playByUrl(deviceId: string, url: string, title?: string): Promise<MiPlayByUrlResponse>;
  /** 批量推送播放列表到小爱音箱（对齐 mobile playMiDevicePlaylist） */
  playPlaylist(deviceId: string, tracks: MiTrackPayload[], startIndex?: number): Promise<MiPlayPlaylistResponse>;

  // ===== 唤醒关键字 =====
  getKeywords(): Promise<MiKeywordsResponse>;
  addKeyword(keyword: string): Promise<MiAddKeywordResponse>;
  updateKeyword(id: number, patch: MiKeywordPatch): Promise<MiSimpleResponse>;
  deleteKeyword(id: number): Promise<MiSimpleResponse>;

  // ===== 历史记录 =====
  getConversations(q?: MiPageQuery): Promise<MiPagedResponse<MiConversation>>;
  getCasts(q?: MiPageQuery): Promise<MiPagedResponse<MiCastRecord>>;
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

  async playPlaylist(deviceId: string, tracks: MiTrackPayload[], startIndex?: number): Promise<MiPlayPlaylistResponse> {
    const q: Record<string, string | number | boolean> = {};
    q['device_id'] = deviceId;
    q['start_index'] = startIndex ?? 0;
    return httpClient.request<MiPlayPlaylistResponse>({ method: 'POST', url: '/mi/api/play_playlist', params: q, data: tracks });
  }

  async logout(): Promise<MiSimpleResponse> {
    return httpClient.post<MiSimpleResponse>('/mi/api/auth/logout');
  }

  // ===== 唤醒关键字 =====

  async getKeywords(): Promise<MiKeywordsResponse> {
    return httpClient.get<MiKeywordsResponse>('/mi/api/keywords');
  }

  async addKeyword(keyword: string): Promise<MiAddKeywordResponse> {
    const data: Record<string, string> = {};
    data['keyword'] = keyword;
    return httpClient.post<MiAddKeywordResponse>('/mi/api/keywords', data);
  }

  async updateKeyword(id: number, patch: MiKeywordPatch): Promise<MiSimpleResponse> {
    const data: Record<string, string | boolean> = {};
    if (patch.keyword !== undefined) data['keyword'] = patch.keyword;
    if (patch.enabled !== undefined) data['enabled'] = patch.enabled;
    return httpClient.put<MiSimpleResponse>(`/mi/api/keywords/${id}`, data);
  }

  async deleteKeyword(id: number): Promise<MiSimpleResponse> {
    return httpClient.del<MiSimpleResponse>(`/mi/api/keywords/${id}`);
  }

  // ===== 历史记录 =====

  async getConversations(q?: MiPageQuery): Promise<MiPagedResponse<MiConversation>> {
    const params: Record<string, string | number | boolean> = {};
    if (q?.page !== undefined) params['page'] = q.page;
    if (q?.size !== undefined) params['size'] = q.size;
    if (q?.device_id !== undefined) params['device_id'] = q.device_id;
    if (q?.start_ms !== undefined) params['start_ms'] = q.start_ms;
    if (q?.end_ms !== undefined) params['end_ms'] = q.end_ms;
    return httpClient.get<MiPagedResponse<MiConversation>>('/mi/api/conversations', params);
  }

  async getCasts(q?: MiPageQuery): Promise<MiPagedResponse<MiCastRecord>> {
    const params: Record<string, string | number | boolean> = {};
    if (q?.page !== undefined) params['page'] = q.page;
    if (q?.size !== undefined) params['size'] = q.size;
    if (q?.device_id !== undefined) params['device_id'] = q.device_id;
    if (q?.start_ms !== undefined) params['start_ms'] = q.start_ms;
    if (q?.end_ms !== undefined) params['end_ms'] = q.end_ms;
    return httpClient.get<MiPagedResponse<MiCastRecord>>('/mi/api/casts', params);
  }
}

export const miApi: MiApi = new MiApiImpl();
