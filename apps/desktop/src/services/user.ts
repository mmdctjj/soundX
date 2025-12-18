import request from "../https";
import { type ILoadMoreData, type ISuccessResponse } from "../models";
import { useAuthStore } from "../store/auth";

const getUserId = () => useAuthStore.getState().user?.id;

export const addToHistory = (trackId: number, progress: number = 0, deviceName?: string, deviceId?: number, isSyncMode?: boolean) => {
  return request.post<any, ISuccessResponse<any>>("/user-track-histories", {
    trackId,
    userId: getUserId(),
    progress,
    deviceName,
    deviceId,
    isSyncMode,
  });
};

export const getLatestHistory = () => {
    const userId = getUserId();
    if (!userId) return Promise.resolve(null);
    return request.get<any, ISuccessResponse<any>>("/user-track-histories/latest", {
        params: { userId }
    });
};

export const addAlbumToHistory = (albumId: number) => {
  return request.post<any, ISuccessResponse<any>>("/user-album-histories", {
    albumId,
    userId: getUserId(),
  });
};

export const getAlbumHistory = (loadCount: number, pageSize: number) => {
  return request.get<any, ISuccessResponse<ILoadMoreData<any>>>("/user-album-histories/load-more", {
    params: { pageSize, loadCount, userId: getUserId() },
  });
};

export const toggleLike = (trackId: number) => {
  return request.post<any, ISuccessResponse<any>>("/user-track-likes/create", {
    trackId,
    userId: getUserId(),
  });
};

export const toggleUnLike = (trackId: number) => {
  return request.delete<any, ISuccessResponse<any>>("/user-track-likes/unlike", {
    params: { trackId, userId: getUserId() },
  });
};

export const toggleAlbumLike = (albumId: number) => {
  return request.post<any, ISuccessResponse<any>>("/user-album-likes", {
    albumId,
    userId: getUserId(),
  });
};

export const unlikeAlbum = (albumId: number) => {
  return request.delete<any, ISuccessResponse<any>>("/user-album-likes/unlike", {
    params: { albumId, userId: getUserId() },
  });
};

export const getFavoriteAlbums = (loadCount: number, pageSize: number) => {
  return request.get<any, ISuccessResponse<ILoadMoreData<any>>>("/user-album-likes/load-more", {
    params: { pageSize, loadCount, userId: getUserId() },
  });
};

export const getFavoriteTracks = (loadCount: number, pageSize: number) => {
  return request.get<any, ISuccessResponse<ILoadMoreData<any>>>("/user-track-likes/load-more", {
    params: { pageSize, loadCount: loadCount, userId: getUserId(), lastId: loadCount },
  });
};

export const getTrackHistory = (loadCount: number, pageSize: number) => {
  return request.get<any, ISuccessResponse<ILoadMoreData<any>>>("/user-track-histories/load-more", {
    params: { pageSize, loadCount: loadCount, userId: getUserId() },
  });
};

export const getUserList = () => {
  return request.get<any, ISuccessResponse<any[]>>("/user/list");
};
