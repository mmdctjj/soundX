import { ILoadMoreData, ISuccessResponse, Playlist, Track, TrackType } from "../../models";
import { IPlaylistAdapter } from "../interface";
import { SubsonicClient } from "./client";
import { mapSubsonicSongToTrack } from "./mapper";

export class SubsonicPlaylistAdapter implements IPlaylistAdapter {
  constructor(private client: SubsonicClient) {}

  private response<T>(data: T): ISuccessResponse<T> {
    return {
      code: 200,
      message: "success",
      data
    };
  }

  private formatLyrics(lyricsRes: any): string | null {
    if (!lyricsRes) return null;
    
    // Check for OpenSubsonic structuredLyrics
    const structured = lyricsRes.lyricsList?.structuredLyrics?.[0];
    if (structured && structured.line) {
        return structured.line.map((l: any) => {
            const totalMs = l.start || 0;
            const minutes = Math.floor(totalMs / 60000);
            const seconds = Math.floor((totalMs % 60000) / 1000);
            const ms = totalMs % 1000;
            // Format: [mm:ss.SS]
            const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}]`;
            return `${timestamp}${l.value || ''}`;
        }).join('\n');
    }
    
    // Check for plain lyrics (older Subsonic)
    const lyricsData = lyricsRes.lyrics;
    return lyricsData?.value || lyricsData?.["$"] || (typeof lyricsData === 'string' ? lyricsData : null);
  }

  private async mapTracksWithLyrics(songs: any[]): Promise<any[]> {
    return Promise.all(songs.map(async s => {
        let lyrics = null;
        try {
            if (s.artist && s.title) {
                const lyricsRes = await this.client.get<any>("getLyricsBySongId", { 
                    id: s.id,
                }).catch(() => null);
                
                if (lyricsRes) {
                    lyrics = this.formatLyrics(lyricsRes);
                }
            }
        } catch (e) {}
        return mapSubsonicSongToTrack(s, (id) => this.client.getCoverUrl(id), (id) => this.client.getStreamUrl(id), lyrics);
    }));
  }

  async createPlaylist(name: string, type: "MUSIC" | "AUDIOBOOK", userId: number | string): Promise<ISuccessResponse<Playlist>> {
    const res = await this.client.get<{ playlist: any }>("createPlaylist", { name });
    return this.response(await this.mapPlaylist(res.playlist));
  }

  async getPlaylists(type?: "MUSIC" | "AUDIOBOOK", userId?: number | string): Promise<ISuccessResponse<Playlist[]>> {
    const res = await this.client.get<{ playlists: { playlist: any[] } }>("getPlaylists");
    const list = await Promise.all((res.playlists?.playlist || []).map(p => this.mapPlaylist(p)));
    return this.response(list);
  }

  async getPlaylistById(id: number | string): Promise<ISuccessResponse<Playlist>> {
    const res = await this.client.get<{ playlist: any }>("getPlaylist", { id: id.toString() });
    return this.response(await this.mapPlaylist(res.playlist));
  }

  async getPlaylistTracksPaged(id: number | string, skip: number, pageSize: number): Promise<ISuccessResponse<ILoadMoreData<Track>>> {
    // Subsonic getPlaylist 不原生支持分页；前端要分页只能先全量拉再切片。
    // 对于典型 Navidrome/Jellyfin 服务器单 playlist 曲目通常不会上千，先全量再分页足够。
    const res = await this.client.get<{ playlist: any }>("getPlaylist", { id: id.toString() });
    const entries: any[] = res.playlist?.entry || [];
    const total = entries.length;
    const safeSkip = Math.max(0, skip);
    const slice = entries.slice(safeSkip, safeSkip + pageSize);
    const tracks = await this.mapTracksWithLyrics(slice);
    return this.response({
      pageSize,
      loadCount: Math.floor(safeSkip / pageSize),
      list: tracks,
      total,
      hasMore: safeSkip + tracks.length < total,
    });
  }

  async updatePlaylist(id: number | string, name: string): Promise<ISuccessResponse<Playlist>> {
    await this.client.get("updatePlaylist", { playlistId: id.toString(), name });
    return await this.getPlaylistById(id);
  }

  async deletePlaylist(id: number | string): Promise<ISuccessResponse<boolean>> {
    await this.client.get("deletePlaylist", { id: id.toString() });
    return this.response(true);
  }

  async addTrackToPlaylist(playlistId: number | string, trackId: number | string): Promise<ISuccessResponse<boolean>> {
    await this.client.get("updatePlaylist", { playlistId: playlistId.toString(), songIdToAdd: trackId.toString() });
    return this.response(true);
  }

  async addTracksToPlaylist(playlistId: number | string, trackIds: (number | string)[]): Promise<ISuccessResponse<boolean>> {
    for (const tid of trackIds) {
        await this.addTrackToPlaylist(playlistId, tid);
    }
    return this.response(true);
  }

  async removeTrackFromPlaylist(playlistId: number | string, trackId: number | string): Promise<ISuccessResponse<boolean>> {
    const res = await this.client.get<{ playlist: { entry: any[] } }>("getPlaylist", { id: playlistId.toString() });
    const entries = res.playlist?.entry || [];
    const index = entries.findIndex(e => e.id === trackId.toString());
    if (index !== -1) {
        await this.client.get("updatePlaylist", { playlistId: playlistId.toString(), songIndexToRemove: index });
        return this.response(true);
    }
    return this.response(false);
  }

  private async mapPlaylist(p: any): Promise<Playlist> {
    const tracks = await this.mapTracksWithLyrics(p.entry || []);
    
    return {
      id: p.id,
      name: p.name,
      type: TrackType.MUSIC, 
      userId: 0, 
      createdAt: p.created,
      updatedAt: p.changed,
      tracks: tracks,
      _count: {
        tracks: p.songCount || tracks.length || 0
      }
    } as any;
  }
}
