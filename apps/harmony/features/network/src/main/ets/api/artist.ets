import { httpClient } from '../HarmonyHttpClient';
import type { TrackDto } from './track';
import type { AlbumDto } from './album';

export interface ArtistDto {
  id: string; name: string; avatarUrl?: string; description?: string;
}

export interface ArtistDetailResp {
  artist: ArtistDto; albums?: AlbumDto[]; tracks?: TrackDto[];
}

export interface ArtistListResp { data: ArtistDto[]; total: number }

export interface ArtistListParams {
  pageSize: number;
  loadCount: number;
}

export interface ArtistLatestParams {
  pageSize?: number;
  random?: boolean;
}

export interface ArtistApi {
  list(params: ArtistListParams): Promise<ArtistListResp>;
  getById(id: string): Promise<ArtistDetailResp>;
  latest(params: ArtistLatestParams): Promise<ArtistDto[]>;
  search(keyword: string, limit: number): Promise<ArtistDto[]>;
}

class ArtistApiImpl implements ArtistApi {
  async list(params: ArtistListParams): Promise<ArtistListResp> {
    const p = new Map<string, string | number | boolean>();
    p.set('pageSize', params.pageSize);
    p.set('loadCount', params.loadCount);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get<ArtistListResp>('/artist/list', record);
  }
  async getById(id: string): Promise<ArtistDetailResp> {
    return httpClient.get<ArtistDetailResp>(`/artist/${id}`);
  }
  async latest(params: ArtistLatestParams): Promise<ArtistDto[]> {
    const p = new Map<string, string | number | boolean>();
    if (params.pageSize !== undefined) p.set('pageSize', params.pageSize);
    if (params.random !== undefined) p.set('random', params.random);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get<ArtistDto[]>('/artist/latest', record);
  }
  async search(keyword: string, limit: number): Promise<ArtistDto[]> {
    const p = new Map<string, string | number | boolean>();
    p.set('keyword', keyword);
    p.set('limit', limit);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get<ArtistDto[]>('/artist/search', record);
  }
}

export const artistApi: ArtistApi = new ArtistApiImpl();
