import { IMvAdapter } from "../interface";
import { Mv } from "../../models";

export class EmbyMvAdapter implements IMvAdapter {
  async getMvList(pageSize: number, skip: number, keyword?: string): Promise<{ list: Mv[]; total: number }> {
    return { list: [], total: 0 };
  }

  async getMvById(id: number | string): Promise<Mv | null> {
    return null;
  }

  async getMvsByArtist(artist: string): Promise<Mv[]> {
    return [];
  }

  async getMvsByAlbum(album: string, artist: string): Promise<Mv[]> {
    return [];
  }

  async getMvByTrackId(trackId: number | string): Promise<Mv | null> {
    return null;
  }

  async getRandomMvs(limit: number): Promise<Mv[]> {
    return [];
  }
}
