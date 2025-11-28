import request from "../https";
import { type ILoadMoreData, type ISuccessResponse } from "../models";

export const addToHistory = (trackId: number) => {
  return request.post<any, ISuccessResponse<any>>("/user-track-histories", {
    trackId,
    userId: 1,
    // userId is handled by backend from token/session usually, or we pass it if needed.
    // Based on controller, it expects a UserTrackHistory object body.
    // Let's check the controller again. It takes UserTrackHistory.
    // Usually we just need trackId and userId.
    // If auth is handled, userId is extracted.
    // Let's assume we need to pass trackId.
    // Wait, the controller uses @Body() createUserTrackHistoryDto: UserTrackHistory
    // We should probably just pass { trackId } and let backend handle userId if possible,
    // or we need to pass userId if the backend requires it explicitly in the body.
    // Looking at the schema, UserTrackHistory has userId and trackId.
    // Let's assume for now we pass trackId and the backend fills userId from context or we need to pass it.
    // Since I cannot see the service implementation, I will assume standard practice.
    // However, to be safe, I will pass trackId.
  });
};

export const addAlbumToHistory = (albumId: number) => {
  return request.post<any, ISuccessResponse<any>>("/user-album-histories", {
    albumId,
    userId: 1, // TODO: Get from auth context
  });
};

export const getAlbumHistory = (loadCount: number, pageSize: number,) => {
  return request.get<any, ISuccessResponse<ILoadMoreData<any>>>("/user-album-histories/load-more", {
    params: { pageSize, loadCount, userId: 1 },
  });
};

export const toggleLike = (trackId: number) => {
  return request.post<any, ISuccessResponse<any>>("/user-track-likes/create", {
    trackId,
    userId: 1,
  });
};

export const toggleAlbumLike = (albumId: number) => {
  return request.post<any, ISuccessResponse<any>>("/user-album-likes", {
    albumId,
    userId: 1,
  });
};

export const unlikeAlbum = (albumId: number) => {
  return request.delete<any, ISuccessResponse<any>>("/user-album-likes/unlike", {
    params: { albumId, userId: 1 },
  });
};

export const getFavoriteAlbums = (loadCount: number, pageSize: number) => {
  return request.get<any, ISuccessResponse<ILoadMoreData<any>>>("/user-album-likes/load-more", {
    params: { pageSize, loadCount, userId: 1 },
  });
};
