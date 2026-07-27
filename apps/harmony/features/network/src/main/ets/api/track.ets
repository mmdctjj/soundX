import { httpClient } from '../HarmonyHttpClient';

export interface TrackDto {
  id: string; title: string; artist?: string; album?: string;
  duration?: number; coverUrl?: string; ext?: string;
  source?: string; trackNumber?: number;
}

export interface PlaybackQuality { level: string; url: string; bitrate?: number }

export interface TrackListResp { data: TrackDto[]; total: number }

export interface TrackListParams {
  pageSize: number;
  loadCount: number;
  type?: string;
}

export interface TrackSearchParams {
  keyword: string;
  limit?: number;
}

export interface TrackLatestParams {
  type?: string;
  random?: boolean;
  pageSize?: number;
}

export interface TrackApi {
  list(params: TrackListParams): Promise<TrackListResp>;
  getById(id: string): Promise<TrackDto>;
  search(params: TrackSearchParams): Promise<TrackDto[]>;
  latest(params: TrackLatestParams): Promise<TrackDto[]>;
  recommended(limit: number): Promise<TrackDto[]>;
  playbackQualities(id: string): Promise<PlaybackQuality[]>;
  streamUrl(id: string, quality: string): string;
}

class TrackApiImpl implements TrackApi {
  async list(params: TrackListParams): Promise<TrackListResp> {
    const p = new Map<string, string | number | boolean>();
    p.set('pageSize', params.pageSize);
    p.set('loadCount', params.loadCount);
    if (params.type !== undefined) p.set('type', params.type);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get<TrackListResp>('/track/list', record);
  }
  async getById(id: string): Promise<TrackDto> {
    return httpClient.get<TrackDto>(`/track/${id}`);
  }
  async search(params: TrackSearchParams): Promise<TrackDto[]> {
    const p = new Map<string, string | number | boolean>();
    p.set('keyword', params.keyword);
    if (params.limit !== undefined) p.set('limit', params.limit);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get<TrackDto[]>('/track/search', record);
  }
  async latest(params: TrackLatestParams): Promise<TrackDto[]> {
    const p = new Map<string, string | number | boolean>();
    if (params.type !== undefined) p.set('type', params.type);
    if (params.random !== undefined) p.set('random', params.random);
    if (params.pageSize !== undefined) p.set('pageSize', params.pageSize);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get<TrackDto[]>('/track/latest', record);
  }
  async recommended(limit: number): Promise<TrackDto[]> {
    const p = new Map<string, string | number | boolean>();
    p.set('limit', limit);
    const record: Record<string, string | number | boolean> = {};
    const keys = Array.from(p.keys());
    for (let i = 0; i < keys.length; i++) {
      record[keys[i]] = p.get(keys[i])!;
    }
    return httpClient.get<TrackDto[]>('/track/recommended', record);
  }
  async playbackQualities(id: string): Promise<PlaybackQuality[]> {
    return httpClient.get<PlaybackQuality[]>(`/track/${id}/playback-qualities`);
  }
  streamUrl(id: string, quality: string): string {
    const base = httpClient.getBaseURL();
    return `${base}/track/stream/${id}?quality=${encodeURIComponent(quality)}`;
  }
}

export const trackApi: TrackApi = new TrackApiImpl();
