import request from "../https";
import type {
  Album,
  ILoadMoreData,
  ISuccessResponse,
  ITableData,
} from "../models";

export const getAlbumList = () => {
  return request.get<any, ISuccessResponse<Album[]>>("/album/list");
};

export const getAlbumTableList = (params: {
  pageSize: number;
  current: number;
}) => {
  return request.get<any, ISuccessResponse<ITableData<Album[]>>>(
    "/album/table-list",
    { params }
  );
};

export const loadMoreAlbum = (params: {
  pageSize: number;
  loadCount: number;
}) => {
  return request.get<any, ISuccessResponse<ILoadMoreData<Album[]>>>(
    "/album/load-more",
    { params }
  );
};

export const createAlbum = (data: Omit<Album, "id">) => {
  return request.post<any, ISuccessResponse<Album>>("/album", data);
};

export const updateAlbum = (id: number, data: Partial<Album>) => {
  return request.put<any, ISuccessResponse<Album>>(`/album/${id}`, data);
};

export const deleteAlbum = (id: number) => {
  return request.delete<any, ISuccessResponse<boolean>>(`/album/${id}`);
};

export const batchCreateAlbums = (data: Omit<Album, "id">[]) => {
  return request.post<any, ISuccessResponse<boolean>>(
    "/album/batch-create",
    data
  );
};

export const batchDeleteAlbums = (ids: number[]) => {
  return request.delete<any, ISuccessResponse<boolean>>(
    "/album/batch-delete",
    { data: ids }
  );
};

// Get recommended albums (8 random unlistened albums)
export const getRecommendedAlbums = (type?: string) => {
  return request.get<any, ISuccessResponse<Album[]>>("/album/recommend", {
    params: type ? { type } : undefined,
  });
};

// Get recent albums (8 latest albums)
export const getRecentAlbums = (type?: string) => {
  return request.get<any, ISuccessResponse<Album[]>>("/album/latest", {
    params: type ? { type } : undefined,
  });
};

// Get album details by ID
export const getAlbumById = (id: number) => {
  return request.get<any, ISuccessResponse<Album>>(`/album/${id}`);
};

// Get album tracks with pagination
export const getAlbumTracks = (
  id: number,
  pageSize: number,
  skip: number,
  sort: "asc" | "desc" = "asc",
  keyword?: string
) => {
  return request.get<any, ISuccessResponse<{ list: any[]; total: number }>>(
    `/album/${id}/tracks`,
    {
      params: { pageSize, skip, sort, keyword },
    }
  );
};

export const getAlbumsByArtist = (artist: string) => {
  return request.get<any, ISuccessResponse<Album[]>>(`/album/artist/${artist}`);
};
