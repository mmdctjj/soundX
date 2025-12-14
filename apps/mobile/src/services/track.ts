import request from "../https";
import type {
  ILoadMoreData,
  ISuccessResponse,
  ITableData,
  Track,
} from "../models";

export const getTrackList = () => {
  return request.get<any, ISuccessResponse<Track[]>>("/track/list");
};

export const getTrackTableList = (params: {
  pageSize: number;
  current: number;
}) => {
  return request.get<any, ISuccessResponse<ITableData<Track>>>(
    "/table-list",
    { params }
  );
};

export const loadMoreTrack = (params: {
  pageSize: number;
  loadCount: number;
}) => {
  return request.get<any, ISuccessResponse<ILoadMoreData<Track>>>(
    "/load-more",
    { params }
  );
};

export const createTrack = (data: Omit<Track, "id">) => {
  return request.post<any, ISuccessResponse<Track>>("/track", data);
};

export const updateTrack = (id: number, data: Partial<Track>) => {
  return request.put<any, ISuccessResponse<Track>>(`/track/${id}`, data);
};

export const deleteTrack = (id: number) => {
  return request.delete<any, ISuccessResponse<boolean>>(`/track/${id}`);
};

export const batchCreateTracks = (data: Omit<Track, "id">[]) => {
  return request.post<any, ISuccessResponse<boolean>>(
    "/track/batch-create",
    data
  );
};

export const batchDeleteTracks = (ids: number[]) => {
  return request.delete<any, ISuccessResponse<boolean>>(
    "/track/batch-delete",
    { data: ids }
  );
};

export const getLatestTracks = (type?: string) => {
  return request.get<any, ISuccessResponse<Track[]>>("/track/latest", {
    params: { type },
  });
};

export const getTracksByArtist = (artist: string) => {
  return request.get<any, ISuccessResponse<Track[]>>("/track/artist", {
    params: { artist },
  });
};

export const likeTrack = (data: { userId: number; trackId: number }) => {
  return request.post<any, ISuccessResponse<any>>("/user-track-likes/create", data);
};

export const unlikeTrack = (userId: number, trackId: number) => {
  return request.delete<any, ISuccessResponse<any>>("/user-track-likes/unlike", {
    params: { userId, trackId },
  });
};
