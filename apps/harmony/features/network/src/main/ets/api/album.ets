import { httpClient } from '../HarmonyHttpClient';
import type { TrackDto } from './track';

export interface AlbumDto {
  id: string; name: string; artist?: string; coverUrl?: string;
  releaseDate?: string; description?: string; trackCount?: number;
}

export interface AlbumDetailResp extends AlbumDto { tracks?: TrackDto[] }

export interface AlbumListResp { data: AlbumDto[]; total: number }

export interface AlbumListParams {
  pageSize: number;
  loadCount: number;
}

export interface AlbumLatestParams {
  pageSize?: number;
  random?: boolean;
}

export interface AlbumApi {
  list(params: AlbumListParams): Promise<AlbumListResp>;
  getById(id: string): Promise<AlbumDetailResp>;
  latest(params: AlbumLatestParams): Promise<AlbumDto[]>;
  recommended(limit: number): Promise<AlbumDto[]>;
  search(keyword: string, limit: number): Promise<AlbumDto[]>;
}

class AlbumApiImpl implements AlbumApi {
  async list(params: AlbumListParams): Promise<AlbumListResp> {
    const p = new Map<string, string | number | boolean>();
    p.set('pageSize', params.pageSize);
    p.set('loadCount', params.loadCount);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get<AlbumListResp>('/album/list', record);
  }
  async getById(id: string): Promise<AlbumDetailResp> {
    return httpClient.get<AlbumDetailResp>(`/album/${id}`);
  }
  async latest(params: AlbumLatestParams): Promise<AlbumDto[]> {
    const p = new Map<string, string | number | boolean>();
    if (params.pageSize !== undefined) p.set('pageSize', params.pageSize);
    if (params.random !== undefined) p.set('random', params.random);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get<AlbumDto[]>('/album/latest', record);
  }
  async recommended(limit: number): Promise<AlbumDto[]> {
    const p = new Map<string, string | number | boolean>();
    p.set('limit', limit);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get<AlbumDto[]>('/album/recommended', record);
  }
  async search(keyword: string, limit: number): Promise<AlbumDto[]> {
    const p = new Map<string, string | number | boolean>();
    p.set('keyword', keyword);
    p.set('limit', limit);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get<AlbumDto[]>('/album/search', record);
  }
}

export const albumApi: AlbumApi = new AlbumApiImpl();
