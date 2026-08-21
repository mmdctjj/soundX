import { common } from '@kit.AbilityKit';
import request from '@ohos.request';
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
  /** 上传后服务端返回的头像 URL（部分后端只回 success body） */
  url?: string;
  /** 部分后端结构（mobile native 返回） */
  avatar?: string;
}

export interface UserApi {
  list(params: ListParams): Promise<ListResponse>;
  create(payload: CreatePayload): Promise<UserItem>;
  delete(id: string): Promise<void>;
  uploadAvatar(id: string, fileUri: string, mimeType?: string): Promise<UploadAvatarResponse>;
}

class UserApiImpl implements UserApi {
  async list(params: ListParams): Promise<ListResponse> {
    const record: Record<string, string> = {};
    record['pageSize'] = String(params.pageSize);
    record['loadCount'] = String(params.loadCount);
    return httpClient.get<ListResponse>('/user/list', record);
  }
  async create(payload: CreatePayload): Promise<UserItem> {
    return httpClient.post<UserItem>('/user', payload);
  }
  async delete(id: string): Promise<void> {
    return httpClient.del<void>(`/user/${id}`);
  }

  /**
   * 头像上传：multipart/form-data。
   * 对齐 mobile packages/services/src/adapter/native/user.ts 的 uploadUserAvatar，
   * 字段名固定为 'file'。参考 services/speechService.ets 用 @ohos.request.uploadFile 实现。
   */
  async uploadAvatar(id: string, fileUri: string, mimeType?: string): Promise<UploadAvatarResponse> {
    const context = getContext() as common.UIAbilityContext;
    const fileName = fileUri.split('/').pop() || `avatar-${id}.jpg`;
    const url = `${httpClient.getBaseURL()}/user/${id}/avatar`;

    const headers: Record<string, string> = { 'Content-Type': 'multipart/form-data' };
    const token = httpClient.getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const uploadConfig: request.UploadConfig = {
      url: url,
      header: headers,
      method: 'POST',
      files: [{
        filename: fileName,
        name: 'file',
        uri: fileUri,
        type: mimeType ?? 'image/jpeg',
      }],
      data: [],
    };

    const uploadTask = await request.uploadFile(context, uploadConfig);
    const raw = await new Promise<string>((resolve, reject) => {
      uploadTask.on('complete', (data: Object): void => {
        try {
          // 鸿蒙在不同 API 版本返回对象或数组；兼容两种结构取响应文本
          const obj: Record<string, Object> = data as Record<string, Object>;
          if (obj['result'] !== undefined && typeof obj['result'] === 'string') {
            resolve(obj['result']);
            return;
          }
          if (obj['data'] !== undefined && typeof obj['data'] === 'string') {
            resolve(obj['data']);
            return;
          }
          resolve('');
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      });
      uploadTask.on('fail', (err: request.TaskState[]): void => {
        reject(new Error(`avatar upload failed: ${JSON.stringify(err)}`));
      });
    });

    if (raw.length === 0) {
      return {};
    }
    try {
      const parsed: Record<string, Object> = JSON.parse(raw) as Record<string, Object>;
      const inner: Record<string, Object> | undefined =
        parsed['data'] !== undefined ? (parsed['data'] as Record<string, Object>) : undefined;
      const out: UploadAvatarResponse = {};
      if (typeof parsed['avatar'] === 'string') out.avatar = parsed['avatar'];
      if (inner && typeof inner['avatar'] === 'string') out.avatar = inner['avatar'];
      if (typeof parsed['url'] === 'string') out.url = parsed['url'];
      if (inner && typeof inner['url'] === 'string') out.url = inner['url'];
      return out;
    } catch {
      return {};
    }
  }
}

export const userApi: UserApi = new UserApiImpl();