import { IMvAdapter } from "../interface";
import { Mv, ISuccessResponse, ITableData } from "../../models";
import request from "../../request";

export class NativeMvAdapter implements IMvAdapter {
  async getMvList(pageSize: number, skip: number, keyword?: string): Promise<{ list: Mv[]; total: number }> {
    const res = await request.get<any, ISuccessResponse<ITableData<Mv[]>>>("/mv/list", {
      params: { pageSize, skip, keyword },
    });
    return { list: res.data.list, total: res.data.total };
  }

  async getMvById(id: number | string): Promise<Mv | null> {
    const res = await request.get<any, ISuccessResponse<Mv | null>>(`/mv/${id}`);
    return res.data;
  }

  async getMvsByArtist(artist: string): Promise<Mv[]> {
    const res = await request.get<any, ISuccessResponse<Mv[]>>(`/mv/artist/${artist}`);
    return res.data;
  }

  async getMvsByAlbum(album: string, artist: string): Promise<Mv[]> {
    const res = await request.get<any, ISuccessResponse<Mv[]>>("/mv/album", {
      params: { album, artist },
    });
    return res.data;
  }

  async getMvByTrackId(trackId: number | string): Promise<Mv | null> {
    const res = await request.get<any, ISuccessResponse<Mv | null>>(`/mv/track/${trackId}`);
    return res.data;
  }

  async getRandomMvs(limit: number): Promise<Mv[]> {
    const res = await request.get<any, ISuccessResponse<Mv[]>>("/mv/random", {
      params: { limit },
    });
    return res.data;
  }
}
