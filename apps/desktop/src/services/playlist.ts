import request from "../https";
import type { ISuccessResponse } from "../models";
import { type Track } from "../models";

export interface Playlist {
  id: number;
  name: string;
  type: "MUSIC" | "AUDIOBOOK";
  userId: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tracks: number;
  };
  tracks?: Track[];
}

export const createPlaylist = async (name: string, type: "MUSIC" | "AUDIOBOOK", userId: number) => {
  return await request.post<any, ISuccessResponse<boolean>>("/playlists", { name, type, userId });
};

export const getPlaylists = async (type?: "MUSIC" | "AUDIOBOOK", userId?: number) => {
  return await request.get<any, ISuccessResponse<Playlist[]>>("/playlists", { params: { userId, type } });
};

export const getPlaylistById = async (id: number) => {
  return await request.get<any, ISuccessResponse<Playlist>>(`/playlists/${id}`);
};

export const updatePlaylist = async (id: number, name: string) => {
  return await request.put<any, ISuccessResponse<Playlist>>(`/playlists/${id}`, { name });
};

export const deletePlaylist = async (id: number) => {
  return await request.delete<any, ISuccessResponse<boolean>>(`/playlists/${id}`);
};

export const addTrackToPlaylist = async (playlistId: number, trackId: number) => {
  return await request.post<any, ISuccessResponse<boolean>>(`/playlists/${playlistId}/tracks`, { trackId });
};

export const removeTrackFromPlaylist = async (playlistId: number, trackId: number) => {
  return await request.delete<any, ISuccessResponse<boolean>>(`/playlists/${playlistId}/tracks/${trackId}`);
};
