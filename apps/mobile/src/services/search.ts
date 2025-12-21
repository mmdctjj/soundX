import request from "../https";
import type { Album, Artist, ISuccessResponse, Track } from "../models";

export const searchTracks = (keyword: string, type?: string, limit: number = 10) => {
  return request.get<any, ISuccessResponse<Track[]>>("/track/search", {
    params: { keyword, type, limit },
  });
};

export const searchArtists = (keyword: string, type?: string, limit: number = 10) => {
  return request.get<any, ISuccessResponse<Artist[]>>("/artist/search", {
    params: { keyword, type, limit },
  });
};

export const searchAlbums = (keyword: string, type?: string, limit: number = 10) => {
  return request.get<any, ISuccessResponse<Album[]>>("/album/search", {
    params: { keyword, type, limit },
  });
};
