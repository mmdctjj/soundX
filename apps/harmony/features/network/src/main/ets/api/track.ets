import { httpClient } from '../HarmonyHttpClient';

export interface TrackDto {
  id: string; title: string; artist?: string; album?: string;
  duration?: number; coverUrl?: string; ext?: string;
  source?: string; trackNumber?: number;
}

export interface PlaybackQuality { level: string; url: string; bitrate?: number }

export interface TrackListResp { data: TrackDto[]; total: number }

type Params = Record<string, string | number | boolean>;

export const trackApi = {
  async list(params: { pageSize: number; loadCount: number; type?: string }): Promise<TrackListResp> {
    const p: Params = { pageSize: params.pageSize, loadCount: params.loadCount };
    if (params.type !== undefined) p['type'] = params.type;
    return httpClient.get<TrackListResp>('/track/list', p);
  },
  async getById(id: string): Promise<TrackDto> {
    return httpClient.get<TrackDto>(`/track/${id}`);
  },
  async search(params: { keyword: string; limit?: number }): Promise<TrackDto[]> {
    const p: Params = { keyword: params.keyword };
    if (params.limit !== undefined) p['limit'] = params.limit;
    return httpClient.get<TrackDto[]>('/track/search', p);
  },
  async latest(params: { type?: string; random?: boolean; pageSize?: number }): Promise<TrackDto[]> {
    const p: Params = {};
    if (params.type !== undefined) p['type'] = params.type;
    if (params.random !== undefined) p['random'] = params.random;
    if (params.pageSize !== undefined) p['pageSize'] = params.pageSize;
    return httpClient.get<TrackDto[]>('/track/latest', p);
  },
  async recommended(limit: number = 30): Promise<TrackDto[]> {
    return httpClient.get<TrackDto[]>('/track/recommended', { limit });
  },
  async playbackQualities(id: string): Promise<PlaybackQuality[]> {
    return httpClient.get<PlaybackQuality[]>(`/track/${id}/playback-qualities`);
  },
  streamUrl(id: string, quality: string): string {
    const base = httpClient.getBaseURL();
    return `${base}/track/stream/${id}?quality=${encodeURIComponent(quality)}`;
  },
};
