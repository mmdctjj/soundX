import { httpClient } from '../HarmonyHttpClient';
import type { TrackDto } from './track';

export interface PlaylistDto {
  id: string; name: string; coverUrl?: string; trackCount?: number;
  description?: string; createdAt: string;
}

export interface PlaylistDetailResp extends PlaylistDto { tracks?: TrackDto[] }

export const playlistApi = {
  async list(): Promise<PlaylistDto[]> {
    return httpClient.get<PlaylistDto[]>('/playlist');
  },
  async getById(id: string): Promise<PlaylistDetailResp> {
    return httpClient.get<PlaylistDetailResp>(`/playlist/${id}`);
  },
  async create(name: string): Promise<PlaylistDto> {
    return httpClient.post<PlaylistDto>('/playlist', { name });
  },
  async rename(id: string, name: string): Promise<PlaylistDto> {
    return httpClient.put<PlaylistDto>(`/playlist/${id}`, { name });
  },
  async remove(id: string): Promise<void> {
    return httpClient.del<void>(`/playlist/${id}`);
  },
  async addTrack(id: string, trackId: string): Promise<void> {
    return httpClient.post<void>(`/playlist/${id}/tracks`, { trackId });
  },
  async addTracks(id: string, trackIds: string[]): Promise<void> {
    return httpClient.post<void>(`/playlist/${id}/tracks/batch`, { trackIds });
  },
  async removeTrack(id: string, trackId: string): Promise<void> {
    return httpClient.del<void>(`/playlist/${id}/tracks/${trackId}`);
  },
};
