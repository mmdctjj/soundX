import request from "../https";
import type { ISuccessResponse, Playlist, TrackType } from "../models";

export const getPlaylists = (userId: number, type?: TrackType) => {
  return request.get<any, ISuccessResponse<Playlist[]>>("/playlists", {
    params: { userId, type },
  });
};

export const getPlaylistDetail = (id: number) => {
  return request.get<any, ISuccessResponse<Playlist>>(`/playlists/${id}`);
};

export const createPlaylist = (data: { name: string; type: TrackType; userId: number }) => {
  return request.post<any, ISuccessResponse<Playlist>>("/playlists", data);
};

export const deletePlaylist = (id: number) => {
  return request.delete<any, ISuccessResponse<any>>(`/playlists/${id}`);
};
