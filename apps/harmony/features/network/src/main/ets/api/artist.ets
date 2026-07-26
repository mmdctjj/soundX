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

type Params = Record<string, string | number | boolean>;

export const artistApi = {
  async list(params: { pageSize: number; loadCount: number }): Promise<ArtistListResp> {
    return httpClient.get<ArtistListResp>('/artist/list',
      { pageSize: params.pageSize, loadCount: params.loadCount });
  },
  async getById(id: string): Promise<ArtistDetailResp> {
    return httpClient.get<ArtistDetailResp>(`/artist/${id}`);
  },
  async latest(params: { pageSize?: number; random?: boolean }): Promise<ArtistDto[]> {
    const p: Params = {};
    if (params.pageSize !== undefined) p['pageSize'] = params.pageSize;
    if (params.random !== undefined) p['random'] = params.random;
    return httpClient.get<ArtistDto[]>('/artist/latest', p);
  },
  async search(keyword: string, limit: number = 30): Promise<ArtistDto[]> {
    return httpClient.get<ArtistDto[]>('/artist/search', { keyword, limit });
  },
};
