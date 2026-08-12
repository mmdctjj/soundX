import { httpClient } from '../HarmonyHttpClient';

export interface UserItem {
  id: string; username: string; nickname?: string; role: string;
  createdAt: string; expiresAt?: string | null;
}

export interface ListParams {
  pageSize: number;
  loadCount: number;
}

export interface ListResponse {
  data: UserItem[];
  total: number;
}

export interface CreatePayload {
  username: string;
  password: string;
  nickname?: string;
  role?: string;
}

export interface UploadAvatarResponse {
  url: string;
}

export interface UploadAvatarPayload {
  fileUri: string;
}

export interface UserApi {
  list(params: ListParams): Promise<ListResponse>;
  create(payload: CreatePayload): Promise<UserItem>;
  delete(id: string): Promise<void>;
  uploadAvatar(id: string, fileUri: string): Promise<UploadAvatarResponse>;
}

class UserApiImpl implements UserApi {
  async list(params: ListParams): Promise<ListResponse> {
    const p = new Map<string, string | number | boolean>();
    p.set('pageSize', params.pageSize);
    p.set('loadCount', params.loadCount);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get('/user/list', record);
  }
  async create(payload: CreatePayload): Promise<UserItem> {
    return httpClient.post<UserItem>('/user', payload);
  }
  async delete(id: string): Promise<void> {
    return httpClient.del<void>(`/user/${id}`);
  }
  async uploadAvatar(id: string, fileUri: string): Promise<UploadAvatarResponse> {
    const payload: UploadAvatarPayload = { fileUri: fileUri };
    return httpClient.post<UploadAvatarResponse>(`/user/${id}/avatar`, payload);
  }
}

export const userApi: UserApi = new UserApiImpl();