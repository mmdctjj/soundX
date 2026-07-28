import { httpClient } from '../HarmonyHttpClient';
import type { TableResp } from '../types';

/**
 * 字段名对齐后端 Prisma model Mv（packages/db/prisma/schema.prisma）:
 * id / name / path / artist / album / cover / duration。
 * 后端不返回 title / coverUrl / url。播放地址由 path 派生。
 */
export interface MVDto {
  id: string; name: string; artist?: string; album?: string;
  duration?: number; cover?: string; path?: string;
}

export interface MVListParams {
  pageSize: number;
  skip?: number;
  keyword?: string;
}

export interface MVApi {
  /** GET /mv/list 返回 ITableData（pageSize/current/total/list）。 */
  list(params: MVListParams): Promise<TableResp<MVDto>>;
  getById(id: string): Promise<MVDto | null>;
  byArtist(artist: string): Promise<MVDto[]>;
  /** 后端按“专辑名 + 艺人名”查询，不是 albumId。 */
  byAlbum(album: string, artist: string): Promise<MVDto[]>;
  byTrack(trackId: string): Promise<MVDto | null>;
  random(limit: number): Promise<MVDto[]>;
}

class MVApiImpl implements MVApi {
  async list(params: MVListParams): Promise<TableResp<MVDto>> {
    const q: Record<string, string | number | boolean> = {};
    q['pageSize'] = params.pageSize;
    if (params.skip !== undefined) q['skip'] = params.skip;
    if (params.keyword !== undefined) q['keyword'] = params.keyword;
    return httpClient.get<TableResp<MVDto>>('/mv/list', q);
  }

  async getById(id: string): Promise<MVDto | null> {
    return httpClient.get<MVDto | null>(`/mv/${id}`);
  }

  async byArtist(artist: string): Promise<MVDto[]> {
    return httpClient.get<MVDto[]>(`/mv/artist/${encodeURIComponent(artist)}`);
  }

  async byAlbum(album: string, artist: string): Promise<MVDto[]> {
    const q: Record<string, string | number | boolean> = {};
    q['album'] = album;
    q['artist'] = artist;
    return httpClient.get<MVDto[]>('/mv/album', q);
  }

  async byTrack(trackId: string): Promise<MVDto | null> {
    return httpClient.get<MVDto | null>(`/mv/track/${trackId}`);
  }

  async random(limit: number): Promise<MVDto[]> {
    const q: Record<string, string | number | boolean> = {};
    q['limit'] = limit;
    return httpClient.get<MVDto[]>('/mv/random', q);
  }
}

export const mvApi: MVApi = new MVApiImpl();
