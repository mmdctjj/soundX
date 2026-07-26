import { httpClient } from '../HarmonyHttpClient';

export interface MVDto {
  id: string; title: string; artist?: string; albumId?: string;
  duration?: number; coverUrl?: string; url: string;
}

export interface MVListResp { data: MVDto[]; total: number }

export const mvApi = {
  async list(params: { pageSize: number; loadCount: number }): Promise<MVListResp> {
    return httpClient.get<MVListResp>('/mv/list',
      { pageSize: params.pageSize, loadCount: params.loadCount });
  },
  async getById(id: string): Promise<MVDto> {
    return httpClient.get<MVDto>(`/mv/${id}`);
  },
  async byArtist(artistId: string): Promise<MVDto[]> {
    return httpClient.get<MVDto[]>(`/mv/artist/${artistId}`);
  },
  async byAlbum(albumId: string): Promise<MVDto[]> {
    return httpClient.get<MVDto[]>(`/mv/album/${albumId}`);
  },
  async random(limit: number = 10): Promise<MVDto[]> {
    return httpClient.get<MVDto[]>('/mv/random', { limit });
  },
};
