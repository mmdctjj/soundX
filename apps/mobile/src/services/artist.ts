import request from "../https";
import type {
  Artist,
  ILoadMoreData,
  ISuccessResponse,
  ITableData,
} from "../models";

export const getArtistList = (
  pageSize: number,
  loadCount: number,
  type?: string
) => {
  return request.get<any, ISuccessResponse<ILoadMoreData<Artist>>>(
    "/artist/load-more",
    {
      params: {
        pageSize,
        loadCount,
        type,
      },
    }
  );
};

export const getArtistTableList = (params: {
  pageSize: number;
  current: number;
}) => {
  return request.get<any, ISuccessResponse<ITableData<Artist>>>(
    "/artist/table-list",
    { params }
  );
};

export const loadMoreArtist = (params: {
  pageSize: number;
  loadCount: number;
}) => {
  return request.get<any, ISuccessResponse<ILoadMoreData<Artist>>>(
    "/artist/load-more",
    { params }
  );
};

export const createArtist = (data: Omit<Artist, "id">) => {
  return request.post<any, ISuccessResponse<Artist>>("/artist", data);
};

export const updateArtist = (id: number, data: Partial<Artist>) => {
  return request.put<any, ISuccessResponse<Artist>>(`/artist/${id}`, data);
};

export const deleteArtist = (id: number) => {
  return request.delete<any, ISuccessResponse<boolean>>(`/artist/${id}`);
};

export const batchCreateArtists = (data: Omit<Artist, "id">[]) => {
  return request.post<any, ISuccessResponse<boolean>>(
    "/artist/batch-create",
    data
  );
};

export const batchDeleteArtists = (ids: number[]) => {
  return request.delete<any, ISuccessResponse<boolean>>(
    "/artist/batch-delete",
    { data: ids }
  );
};

export const getArtistById = (id: number) => {
  return request.get<any, ISuccessResponse<Artist>>(`/artist/${id}`);
};

export const getLatestArtists = (type: string) => {
  return request.get<any, ISuccessResponse<Artist[]>>("/artist/latest", { params: { type } });
};
