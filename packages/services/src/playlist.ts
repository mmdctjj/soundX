import { getAdapter } from "./adapter/manager";

export const createPlaylist = async (name: string, type: "MUSIC" | "AUDIOBOOK", userId: number | string) => {
  return await getAdapter().playlist.createPlaylist(name, type, userId);
};

export const getPlaylists = async (type?: "MUSIC" | "AUDIOBOOK", userId?: number | string) => {
  return await getAdapter().playlist.getPlaylists(type, userId);
};

export const getPlaylistById = async (id: number | string) => {
  return await getAdapter().playlist.getPlaylistById(id);
};

/**
 * 分页加载 playlist 内的 tracks；返回 ILoadMoreData<Track>，与 useLoadMore 配套。
 */
export const getPlaylistTracksPaged = async (id: number | string, skip: number, pageSize: number) => {
  return await getAdapter().playlist.getPlaylistTracksPaged(id, skip, pageSize);
};

export const updatePlaylist = async (id: number | string, name: string) => {
  return await getAdapter().playlist.updatePlaylist(id, name);
};

export const deletePlaylist = async (id: number | string) => {
  return await getAdapter().playlist.deletePlaylist(id);
};

export const addTrackToPlaylist = async (playlistId: number | string, trackId: number | string) => {
  return await getAdapter().playlist.addTrackToPlaylist(playlistId, trackId);
};

export const addTracksToPlaylist = async (playlistId: number | string, trackIds: (number | string)[]) => {
  return await getAdapter().playlist.addTracksToPlaylist(playlistId, trackIds);
};

export const removeTrackFromPlaylist = async (playlistId: number | string, trackId: number | string) => {
  return await getAdapter().playlist.removeTrackFromPlaylist(playlistId, trackId);
};
