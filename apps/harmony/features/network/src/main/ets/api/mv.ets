import { httpClient } from '../HarmonyHttpClient';

export interface MVDto {
  id: string; title: string; artist?: string; albumId?: string;
  duration?: number; coverUrl?: string; url: string;
}

export interface MVListResp { data: MVDto[]; total: number }

export interface MVListParams {
  pageSize: number;
  loadCount: number;
}

export interface MVApi {
  list(params: MVListParams): Promise<MVListResp>;
  getById(id: string): Promise<MVDto>;
  byArtist(artistId: string): Promise<MVDto[]>;
  byAlbum(albumId: string): Promise<MVDto[]>;
  random(limit: number): Promise<MVDto[]>;
}

class MVApiImpl implements MVApi {
  async list(params: MVListParams): Promise<MVListResp> {
    const p = new Map<string, string | number | boolean>();
    p.set('pageSize', params.pageSize);
    p.set('loadCount', params.loadCount);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get<MVListResp>('/mv/list', record);
  }
  async getById(id: string): Promise<MVDto> {
    return httpClient.get<MVDto>(`/mv/${id}`);
  }
  async byArtist(artistId: string): Promise<MVDto[]> {
    return httpClient.get<MVDto[]>(`/mv/artist/${artistId}`);
  }
  async byAlbum(albumId: string): Promise<MVDto[]> {
    return httpClient.get<MVDto[]>(`/mv/album/${albumId}`);
  }
  async random(limit: number): Promise<MVDto[]> {
    const p = new Map<string, string | number | boolean>();
    p.set('limit', limit);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get<MVDto[]>('/mv/random', record);
  }
}

export const mvApi: MVApi = new MVApiImpl();
