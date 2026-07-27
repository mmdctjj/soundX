import { httpClient } from '../HarmonyHttpClient';
import type { TrackDto } from './track';

export interface PlaylistDto {
  id: string; name: string; coverUrl?: string; trackCount?: number;
  description?: string; createdAt: string;
}

export interface PlaylistDetailResp extends PlaylistDto { tracks?: TrackDto[] }

export interface PlaylistCreatePayload {
  name: string;
}

export interface PlaylistAddTrackPayload {
  trackId: string;
}

export interface PlaylistAddTracksPayload {
  trackIds: string[];
}

export interface PlaylistApi {
  list(): Promise<PlaylistDto[]>;
  getById(id: string): Promise<PlaylistDetailResp>;
  create(name: string): Promise<PlaylistDto>;
  rename(id: string, name: string): Promise<PlaylistDto>;
  remove(id: string): Promise<void>;
  addTrack(id: string, trackId: string): Promise<void>;
  addTracks(id: string, trackIds: string[]): Promise<void>;
  removeTrack(id: string, trackId: string): Promise<void>;
}

class PlaylistApiImpl implements PlaylistApi {
  async list(): Promise<PlaylistDto[]> {
    return httpClient.get<PlaylistDto[]>('/playlist');
  }
  async getById(id: string): Promise<PlaylistDetailResp> {
    return httpClient.get<PlaylistDetailResp>(`/playlist/${id}`);
  }
  async create(name: string): Promise<PlaylistDto> {
    const payload: PlaylistCreatePayload = { name: name };
    return httpClient.post<PlaylistDto>('/playlist', payload);
  }
  async rename(id: string, name: string): Promise<PlaylistDto> {
    const payload: PlaylistCreatePayload = { name: name };
    return httpClient.put<PlaylistDto>(`/playlist/${id}`, payload);
  }
  async remove(id: string): Promise<void> {
    return httpClient.del<void>(`/playlist/${id}`);
  }
  async addTrack(id: string, trackId: string): Promise<void> {
    const payload: PlaylistAddTrackPayload = { trackId: trackId };
    return httpClient.post<void>(`/playlist/${id}/tracks`, payload);
  }
  async addTracks(id: string, trackIds: string[]): Promise<void> {
    const payload: PlaylistAddTracksPayload = { trackIds: trackIds };
    return httpClient.post<void>(`/playlist/${id}/tracks/batch`, payload);
  }
  async removeTrack(id: string, trackId: string): Promise<void> {
    return httpClient.del<void>(`/playlist/${id}/tracks/${trackId}`);
  }
}

export const playlistApi: PlaylistApi = new PlaylistApiImpl();
