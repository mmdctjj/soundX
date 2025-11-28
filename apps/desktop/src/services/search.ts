import type { Album, Artist, Track } from "@soundx/db";
import request from "../https";
import type { ISuccessResponse } from "../models";

export interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
}

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

export const searchAll = async (keyword: string, type?: string): Promise<SearchResults> => {
  const [tracksRes, artistsRes, albumsRes] = await Promise.all([
    searchTracks(keyword, type, 5),
    searchArtists(keyword, type, 5),
    searchAlbums(keyword, type, 5),
  ]);

  return {
    tracks: tracksRes.code === 200 ? tracksRes.data : [],
    artists: artistsRes.code === 200 ? artistsRes.data : [],
    albums: albumsRes.code === 200 ? albumsRes.data : [],
  };
};
