import request from "../https";
import type { ISuccessResponse, User } from "../models";

export const getUserList = () => {
  return request.get<any, ISuccessResponse<User[]>>("/user/list");
};

export const addToHistory = (trackId: number, userId: number, progress: number = 0, deviceName?: string, isSyncMode?: boolean) => {
  return request.post<any, ISuccessResponse<any>>("/user-track-histories", {
    trackId,
    userId,
    progress,
    deviceName,
    isSyncMode,
  });
};

export const getLatestHistory = (userId: number) => {
  return request.get<any, ISuccessResponse<any>>("/user-track-histories/latest", {
    params: { userId }
  });
};

export const toggleLike = (trackId: number, userId: number) => {
    return request.post<any, ISuccessResponse<any>>("/user-track-likes/create", {
      trackId,
      userId,
    });
};

export const toggleUnLike = (trackId: number, userId: number) => {
    return request.delete<any, ISuccessResponse<any>>("/user-track-likes/unlike", {
      params: { trackId, userId },
    });
};
