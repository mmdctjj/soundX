import { httpClient } from '../HarmonyHttpClient';
import type { LoadMoreResp } from '../types';

/**
 * 字段名对齐后端 Prisma model Artist（packages/db/prisma/schema.prisma）:
 * id / name / avatar / type / bg_cover / description。
 * 后端不返回 avatarUrl。
 */
export interface ArtistDto {
  id: string; name: string; avatar?: string; type?: string;
  bg_cover?: string; description?: string;
}

/**
 * 注意：GET /artist/{id} 返回的是裸 Artist 对象（services/api/src/services/artist.ts:39），
 * 不带 albums / tracks。艺人的专辑与曲目要分别调
 * albumApi.byArtist / albumApi.collaborativeByArtist / trackApi.byArtist，
 * 且它们用的是艺人「名字」而不是 id。
 */
export interface ArtistLoadMoreParams {
  pageSize: number;
  loadCount: number;
  type?: string;
  sortBy?: string;
}

export interface ArtistLatestParams {
  type: string;
  pageSize?: number;
  random?: boolean;
}

export interface ArtistApi {
  list(): Promise<ArtistDto[]>;
  loadMore(params: ArtistLoadMoreParams): Promise<LoadMoreResp<ArtistDto>>;
  getById(id: string): Promise<ArtistDto>;
  latest(params: ArtistLatestParams): Promise<ArtistDto[]>;
  search(keyword: string, limit: number): Promise<ArtistDto[]>;
}

class ArtistApiImpl implements ArtistApi {
  async list(): Promise<ArtistDto[]> {
    return httpClient.get<ArtistDto[]>('/artist/list');
  }

  async loadMore(params: ArtistLoadMoreParams): Promise<LoadMoreResp<ArtistDto>> {
    const q: Record<string, string | number | boolean> = {};
    q['pageSize'] = params.pageSize;
    q['loadCount'] = params.loadCount;
    if (params.type !== undefined) q['type'] = params.type;
    if (params.sortBy !== undefined) q['sortBy'] = params.sortBy;
    return httpClient.get<LoadMoreResp<ArtistDto>>('/artist/load-more', q);
  }

  async getById(id: string): Promise<ArtistDto> {
    return httpClient.get<ArtistDto>(`/artist/${id}`);
  }

  async latest(params: ArtistLatestParams): Promise<ArtistDto[]> {
    const q: Record<string, string | number | boolean> = {};
    q['type'] = params.type;
    if (params.pageSize !== undefined) q['pageSize'] = params.pageSize;
    if (params.random !== undefined) q['random'] = params.random;
    return httpClient.get<ArtistDto[]>('/artist/latest', q);
  }

  async search(keyword: string, limit: number): Promise<ArtistDto[]> {
    const q: Record<string, string | number | boolean> = {};
    q['keyword'] = keyword;
    q['limit'] = limit;
    return httpClient.get<ArtistDto[]>('/artist/search', q);
  }
}

export const artistApi: ArtistApi = new ArtistApiImpl();
