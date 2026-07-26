import { httpClient } from '../HarmonyHttpClient';

export interface UserItem {
  id: string; username: string; nickname?: string; role: string;
  createdAt: string; expiresAt?: string | null;
}

export interface UserApi {
  list(params: { pageSize: number; loadCount: number }): Promise<{ data: UserItem[]; total: number }>;
  create(payload: { username: string; password: string; nickname?: string; role?: string }): Promise<UserItem>;
  delete(id: string): Promise<void>;
  uploadAvatar(id: string, fileUri: string): Promise<{ url: string }>;
}

export const userApi: UserApi = {
  async list(params: { pageSize: number; loadCount: number }): Promise<{ data: UserItem[]; total: number }> {
    return httpClient.get('/user/list', params);
  },
  async create(payload: { username: string; password: string; nickname?: string; role?: string }): Promise<UserItem> {
    return httpClient.post<UserItem>('/user', payload);
  },
  async delete(id: string): Promise<void> {
    return httpClient.del<void>(`/user/${id}`);
  },
  async uploadAvatar(id: string, fileUri: string): Promise<{ url: string }> {
    return httpClient.post<{ url: string }>(`/user/${id}/avatar`, { fileUri });
  },
};