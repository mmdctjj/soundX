import { httpClient } from '../HarmonyHttpClient';
import type { TrackDto } from './track';

/**
 * 后端控制器前缀是 @Controller('playlists')（services/api/src/controllers/playlist.ts），
 * 不是 /playlist。字段名对齐 Prisma model Playlist: id / name / type / createdAt。
 * cover / description / trackCount 由前端按需自构（后端 list/find 不返回）；
 * CoverImage 在 path 为空时会自动显示占位图，所以保留可选字段即可。
 */
export interface PlaylistDto {
  id: string; name: string; type?: string; createdAt?: string; description?: string; trackCount?: number; cover?: string;
}

export interface PlaylistDetailResp extends PlaylistDto { tracks?: TrackDto[] }

export interface PlaylistCreatePayload { name: string; type?: string }
export interface PlaylistAddTrackPayload { trackId: string }
export interface PlaylistAddTracksPayload { trackIds: string[] }

export interface PlaylistApi {
  /** type 可选：MUSIC | AUDIOBOOK。 */
  list(type?: string): Promise<PlaylistDto[]>;
  getById(id: string): Promise<PlaylistDetailResp>;
  create(name: string, type?: string): Promise<PlaylistDto>;
  rename(id: string, name: string): Promise<PlaylistDto>;
  remove(id: string): Promise<void>;
  addTrack(id: string, trackId: string): Promise<void>;
  addTracks(id: string, trackIds: string[]): Promise<void>;
  removeTrack(id: string, trackId: string): Promise<void>;
}

class PlaylistApiImpl implements PlaylistApi {
  async list(type?: string): Promise<PlaylistDto[]> {
    const q: Record<string, string | number | boolean> = {};
    if (type !== undefined && type.length > 0) q['type'] = type;
    return httpClient.get<PlaylistDto[]>('/playlists', q);
  }

  async getById(id: string): Promise<PlaylistDetailResp> {
    return httpClient.get<PlaylistDetailResp>(`/playlists/${id}`);
  }

  async create(name: string, type?: string): Promise<PlaylistDto> {
    const payload: PlaylistCreatePayload = { name: name, type: type };
    return httpClient.post<PlaylistDto>('/playlists', payload);
  }

  async rename(id: string, name: string): Promise<PlaylistDto> {
    const payload: PlaylistCreatePayload = { name: name };
    return httpClient.put<PlaylistDto>(`/playlists/${id}`, payload);
  }

  async remove(id: string): Promise<void> {
    return httpClient.del<void>(`/playlists/${id}`);
  }

  async addTrack(id: string, trackId: string): Promise<void> {
    const payload: PlaylistAddTrackPayload = { trackId: trackId };
    return httpClient.post<void>(`/playlists/${id}/tracks`, payload);
  }

  async addTracks(id: string, trackIds: string[]): Promise<void> {
    const payload: PlaylistAddTracksPayload = { trackIds: trackIds };
    return httpClient.post<void>(`/playlists/${id}/tracks/batch`, payload);
  }

  async removeTrack(id: string, trackId: string): Promise<void> {
    return httpClient.del<void>(`/playlists/${id}/tracks/${trackId}`);
  }
}

export const playlistApi: PlaylistApi = new PlaylistApiImpl();
