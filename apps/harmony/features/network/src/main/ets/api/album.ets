import { httpClient } from '../HarmonyHttpClient';
import type { LoadMoreResp } from '../types';
import type { TrackDto } from './track';

/**
 * 字段名对齐后端 Prisma model Album（packages/db/prisma/schema.prisma）:
 * id / name / artist / cover / year / type。
 * 后端不返回 coverUrl / releaseDate / description / trackCount。
 * progress 等字段仅在带 userId 的 load-more 响应里出现。
 */
export interface AlbumDto {
  id: string; name: string; artist?: string; cover?: string;
  year?: string; type?: string; description?: string; trackCount?: number;
  progress?: number; resumeTrackId?: string; resumeProgress?: number;
}

/**
 * GET /album/{id}/tracks 的返回形状（services/api/src/controllers/album.ts:425）。
 */
export interface AlbumTracksResp { list: TrackDto[]; total: number }

export interface AlbumListResp { data: AlbumDto[]; total: number }

export interface AlbumLoadMoreParams {
  pageSize: number;
  loadCount: number;
  type: string;
  sortBy?: string;
}

export interface AlbumLatestParams {
  type: string;
  pageSize?: number;
  random?: boolean;
}

export interface AlbumRecommendParams {
  type: string;
  pageSize?: number;
  likeRatio?: number;
}

export interface AlbumApi {
  list(): Promise<AlbumDto[]>;
  loadMore(params: AlbumLoadMoreParams): Promise<LoadMoreResp<AlbumDto>>;
  /** GET /album/{id} 只返回专辑本身，不含 tracks —— 曲目要另调 getTracks。 */
  getById(id: string): Promise<AlbumDto>;
  getTracks(id: string, pageSize: number, skip: number, sort: string, sortBy?: string): Promise<AlbumTracksResp>;
  byArtist(artist: string): Promise<AlbumDto[]>;
  collaborativeByArtist(artist: string): Promise<AlbumDto[]>;
  latest(params: AlbumLatestParams): Promise<AlbumDto[]>;
  recommend(params: AlbumRecommendParams): Promise<AlbumDto[]>;
  search(keyword: string, limit: number): Promise<AlbumDto[]>;
}

class AlbumApiImpl implements AlbumApi {
  async list(): Promise<AlbumDto[]> {
    return httpClient.get<AlbumDto[]>('/album/list');
  }

  async loadMore(params: AlbumLoadMoreParams): Promise<LoadMoreResp<AlbumDto>> {
    const q: Record<string, string | number | boolean> = {};
    q['pageSize'] = params.pageSize;
    q['loadCount'] = params.loadCount;
    q['type'] = params.type;
    if (params.sortBy !== undefined) q['sortBy'] = params.sortBy;
    return httpClient.get<LoadMoreResp<AlbumDto>>('/album/load-more', q);
  }

  async getById(id: string): Promise<AlbumDto> {
    return httpClient.get<AlbumDto>(`/album/${id}`);
  }

  async getTracks(id: string, pageSize: number, skip: number, sort: string, sortBy?: string): Promise<AlbumTracksResp> {
    const q: Record<string, string | number | boolean> = {};
    q['pageSize'] = pageSize;
    q['skip'] = skip;
    q['sort'] = sort;
    if (sortBy !== undefined) q['sortBy'] = sortBy;
    return httpClient.get<AlbumTracksResp>(`/album/${id}/tracks`, q);
  }

  async byArtist(artist: string): Promise<AlbumDto[]> {
    return httpClient.get<AlbumDto[]>(`/album/artist/${encodeURIComponent(artist)}`);
  }

  async collaborativeByArtist(artist: string): Promise<AlbumDto[]> {
    return httpClient.get<AlbumDto[]>(`/album/collaborative/${encodeURIComponent(artist)}`);
  }

  async latest(params: AlbumLatestParams): Promise<AlbumDto[]> {
    const q: Record<string, string | number | boolean> = {};
    q['type'] = params.type;
    if (params.pageSize !== undefined) q['pageSize'] = params.pageSize;
    if (params.random !== undefined) q['random'] = params.random;
    return httpClient.get<AlbumDto[]>('/album/latest', q);
  }

  async recommend(params: AlbumRecommendParams): Promise<AlbumDto[]> {
    const q: Record<string, string | number | boolean> = {};
    q['type'] = params.type;
    if (params.pageSize !== undefined) q['pageSize'] = params.pageSize;
    if (params.likeRatio !== undefined) q['likeRatio'] = params.likeRatio;
    return httpClient.get<AlbumDto[]>('/album/recommend', q);
  }

  async search(keyword: string, limit: number): Promise<AlbumDto[]> {
    const q: Record<string, string | number | boolean> = {};
    q['keyword'] = keyword;
    q['limit'] = limit;
    return httpClient.get<AlbumDto[]>('/album/search', q);
  }
}

export const albumApi: AlbumApi = new AlbumApiImpl();
