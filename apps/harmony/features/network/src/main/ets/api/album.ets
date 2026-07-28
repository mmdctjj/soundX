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

export interface AlbumDetailResp extends AlbumDto { tracks?: TrackDto[] }

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
  getById(id: string): Promise<AlbumDetailResp>;
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

  async getById(id: string): Promise<AlbumDetailResp> {
    return httpClient.get<AlbumDetailResp>(`/album/${id}`);
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
