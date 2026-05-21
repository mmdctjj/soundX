import http from '@ohos.net.http';
import { httpClient } from './HttpClient';

// ============ 数据源映射 ============
export const SOURCEMAP: Record<string, string> = {
  'AudioDock': 'audiodock',
  'Subsonic': 'subsonic',
  'Emby': 'emby'
};

export const SOURCETIPSMAP: Record<string, string> = {
  'AudioDock': '自建 AudioDock 服务端，支持完整的音乐管理功能',
  'Subsonic': '兼容 Subsonic/API 协议的音乐服务器',
  'Emby': 'Emby 媒体服务器'
};

// ============ 数据模型 ============
export interface ApiResponse {
  code: number;
  data: Object | null;
  message?: string;
}

export interface User {
  id: number | string;
  username: string;
  nickname?: string;
  avatar?: string;
  role?: string;
}

export interface Artist {
  id: number | string;
  name: string;
  avatar?: string;
  cover?: string;
}

export interface Album {
  id: number | string;
  name: string;
  artist: string;
  cover?: string;
  type?: string;
  progress?: number;
  resumeTrackId?: number | string;
  resumeProgress?: number;
}

export interface Track {
  id: number | string;
  name: string;
  artist: string;
  cover?: string;
  album?: string;
  liked?: boolean;
  likedByUsers?: Array<LikeUser>;
}

export interface LikeUser {
  userId: number | string;
}

export class TrackImpl implements Track {
  id: number | string = 0;
  name: string = '';
  artist: string = '';
  cover?: string;
  album?: string;
  liked?: boolean;
  likedByUsers?: Array<LikeUser>;
}

// ============ 查询字符串构建 ============
function buildQueryString(params: Record<string, string>): string {
  const pairs: string[] = [];
  const keys = Object.keys(params);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = params[key];
    if (value && value.length > 0) {
      pairs.push(key + '=' + encodeURIComponent(value));
    }
  }
  if (pairs.length > 0) {
    return '?' + pairs.join('&');
  }
  return '';
}

// ============ 用户相关 ============
export async function login(user: Record<string, Object>): Promise<Object> {
  return httpClient.post('/api/auth/login', user);
}

export async function register(user: Record<string, Object>): Promise<Object> {
  return httpClient.post('/api/auth/register', user);
}

export async function getCurrentUser(): Promise<Object> {
  return httpClient.get('/api/auth/me');
}

export async function hello(): Promise<Object> {
  return httpClient.get('/hello');
}

// ============ 艺人相关 ============
export async function getLatestArtists(type?: string, random?: boolean, pageSize?: number): Promise<Object> {
  const params: Record<string, string> = {};
  if (type) {
    params['type'] = type;
  }
  if (random !== undefined) {
    params['random'] = String(random);
  }
  if (pageSize) {
    params['pageSize'] = String(pageSize);
  }
  return httpClient.get('/api/artists/latest' + buildQueryString(params));
}

// ============ 专辑相关 ============
export async function getRecentAlbums(type?: string, random?: boolean, pageSize?: number): Promise<Object> {
  const params: Record<string, string> = {};
  if (type) {
    params['type'] = type;
  }
  if (random !== undefined) {
    params['random'] = String(random);
  }
  if (pageSize) {
    params['pageSize'] = String(pageSize);
  }
  return httpClient.get('/api/albums/recent' + buildQueryString(params));
}

export async function getRecommendedAlbums(type?: string, random?: boolean, pageSize?: number, likeRatio?: number): Promise<Object> {
  const params: Record<string, string> = {};
  if (type) {
    params['type'] = type;
  }
  if (random !== undefined) {
    params['random'] = String(random);
  }
  if (pageSize) {
    params['pageSize'] = String(pageSize);
  }
  if (likeRatio !== undefined) {
    params['likeRatio'] = String(likeRatio);
  }
  return httpClient.get('/api/albums/recommended' + buildQueryString(params));
}

export async function getAlbumTracks(id: number | string, pageSize: number, skip: number): Promise<Object> {
  return httpClient.get('/api/albums/' + id + '/tracks?pageSize=' + pageSize + '&skip=' + skip);
}

export async function getAlbumHistory(userId: number | string, skip: number, pageSize: number, type?: string): Promise<Object> {
  const params: Record<string, string> = {};
  params['skip'] = String(skip);
  params['pageSize'] = String(pageSize);
  if (type) {
    params['type'] = type;
  }
  return httpClient.get('/api/users/' + userId + '/history' + buildQueryString(params));
}

// ============ 曲目相关 ============
export async function getLatestTracks(type?: string, random?: boolean, pageSize?: number): Promise<Object> {
  const params: Record<string, string> = {};
  if (type) {
    params['type'] = type;
  }
  if (random !== undefined) {
    params['random'] = String(random);
  }
  if (pageSize) {
    params['pageSize'] = String(pageSize);
  }
  return httpClient.get('/api/tracks/latest' + buildQueryString(params));
}

export async function toggleTrackLike(id: number | string, userId: number | string): Promise<Object> {
  const body: Record<string, Object> = {};
  body['userId'] = userId;
  return httpClient.post('/api/tracks/' + id + '/like', body);
}

export async function toggleTrackUnLike(id: number | string, userId: number | string): Promise<Object> {
  const body: Record<string, Object> = {};
  body['userId'] = userId;
  return httpClient.post('/api/tracks/' + id + '/unlike', body);
}

// ============ 网络工具 ============
export async function checkServerConnectivity(address: string, sourceType: string): Promise<boolean> {
  if (!address) {
    return false;
  }
  if (!address.startsWith('http://') && !address.startsWith('https://')) {
    return false;
  }

  const mappedType = SOURCEMAP[sourceType] || 'audiodock';

  let pingUrl: string;
  if (mappedType === 'subsonic') {
    pingUrl = address.replace(/\/+$/, '') + '/rest/ping.view?v=1.16.1&c=SoundX&f=json';
  } else if (mappedType === 'emby') {
    pingUrl = address.replace(/\/+$/, '') + '/emby/System/Info/Public';
  } else {
    pingUrl = address.replace(/\/+$/, '') + '/hello';
  }

  const httpRequest = http.createHttp();
  let response: http.HttpResponse;

  try {
    response = await new Promise<http.HttpResponse>((resolve, reject) => {
      httpRequest.request(
        pingUrl,
        {
          method: http.RequestMethod.GET,
          readTimeout: 3000,
          connectTimeout: 3000
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        }
      );
    });
  } catch (error) {
    httpRequest.destroy();
    return false;
  }

  httpRequest.destroy();

  if (response.responseCode >= 200 && response.responseCode < 300) {
    return true;
  }
  if (mappedType === 'subsonic' && response.responseCode === 401) {
    return true;
  }
  return false;
}

export async function selectBestServer(
  internalAddress: string,
  externalAddress: string,
  sourceType: string
): Promise<string | null> {
  if (externalAddress) {
    const externalAlive = await checkServerConnectivity(externalAddress, sourceType);
    if (externalAlive) {
      return externalAddress;
    }
  }
  if (internalAddress) {
    const internalAlive = await checkServerConnectivity(internalAddress, sourceType);
    if (internalAlive) {
      return internalAddress;
    }
  }
  return null;
}
