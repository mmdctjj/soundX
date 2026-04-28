import { Mv } from "./models";
import { getAdapter } from "./adapter/manager";

export const getMvsByArtist = async (artist: string): Promise<Mv[]> => {
  return await getAdapter().mv.getMvsByArtist(artist);
};

export const getMvsByAlbum = async (album: string, artist: string): Promise<Mv[]> => {
  return await getAdapter().mv.getMvsByAlbum(album, artist);
};

export const getMvById = async (id: number): Promise<Mv | null> => {
  return await getAdapter().mv.getMvById(id);
};

export const getMvByTrackId = async (trackId: number): Promise<Mv | null> => {
  return await getAdapter().mv.getMvByTrackId(trackId);
};

export const getMvList = async (
  pageSize: number,
  skip: number,
  keyword?: string
): Promise<{ list: Mv[]; total: number }> => {
  return await getAdapter().mv.getMvList(pageSize, skip, keyword);
};

export const getRandomMvs = async (limit: number): Promise<Mv[]> => {
  return await getAdapter().mv.getRandomMvs(limit);
};
