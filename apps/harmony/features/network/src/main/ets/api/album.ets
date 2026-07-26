import { httpClient } from '../HarmonyHttpClient';
import type { TrackDto } from './track';

export interface AlbumDto {
  id: string; name: string; artist?: string; coverUrl?: string;
  releaseDate?: string; description?: string; trackCount?: number;
}

export interface AlbumDetailResp extends AlbumDto { tracks?: TrackDto[] }

export interface AlbumListResp { data: AlbumDto[]; total: number }

type Params = Record<string, string | number | boolean>;

export const albumApi = {
  async list(params: { pageSize: number; loadCount: number }): Promise<AlbumListResp> {
    return httpClient.get<AlbumListResp>('/album/list',
      { pageSize: params.pageSize, loadCount: params.loadCount });
  },
  async getById(id: string): Promise<AlbumDetailResp> {
    return httpClient.get<AlbumDetailResp>(`/album/${id}`);
  },
  async latest(params: { pageSize?: number; random?: boolean }): Promise<AlbumDto[]> {
    const p: Params = {};
    if (params.pageSize !== undefined) p['pageSize'] = params.pageSize;
    if (params.random !== undefined) p['random'] = params.random;
    return httpClient.get<AlbumDto[]>('/album/latest', p);
  },
  async recommended(limit: number = 20): Promise<AlbumDto[]> {
    return httpClient.get<AlbumDto[]>('/album/recommended', { limit });
  },
  async search(keyword: string, limit: number = 30): Promise<AlbumDto[]> {
    return httpClient.get<AlbumDto[]>('/album/search', { keyword, limit });
  },
};
