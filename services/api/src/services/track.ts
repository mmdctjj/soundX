import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Track, TrackType } from '@soundx/db';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TrackService {
  private prisma: PrismaClient;

  constructor(private readonly configService: ConfigService) {
    this.prisma = new PrismaClient();
  }

  private getFilePath(trackPath: string): string | null {
    if (trackPath.startsWith('/music/')) {
      const musicBaseDir = this.configService.get<string>('MUSIC_BASE_DIR') || './';
      return path.join(path.resolve(musicBaseDir), trackPath.replace('/music/', ''));
    }
    if (trackPath.startsWith('/audio/')) {
      const audioBookDir = this.configService.get<string>('AUDIO_BOOK_DIR') || './';
      return path.join(path.resolve(audioBookDir), trackPath.replace('/audio/', ''));
    }
    return null;
  }

  private async deleteFileSafely(trackPath: string) {
    const absolutePath = this.getFilePath(trackPath);
    if (absolutePath && fs.existsSync(absolutePath)) {
      try {
        await fs.promises.unlink(absolutePath);
        console.log(`Deleted file: ${absolutePath}`);
      } catch (error) {
        console.error(`Failed to delete file: ${absolutePath}`, error);
      }
    }
  }

  async getTrackList(): Promise<Track[]> {
    return await this.prisma.track.findMany();
  }

  async findByPath(path: string): Promise<Track | null> {
    return await this.prisma.track.findFirst({
      where: { path },
      include: {
        artistEntity: true,
        albumEntity: true,
      },
    });
  }

  async getTracksByAlbum(
    albumName: string,
    artist: string,
    pageSize: number,
    skip: number,
    sort: 'asc' | 'desc' = 'asc',
    keyword?: string,
    userId?: number,
  ): Promise<Track[]> {
    const where: any = {
      album: albumName,
      artist: artist,
    };

    if (keyword) {
      where.name = { contains: keyword };
    }

    console.log("getTracksByAlbum", sort);

    const tracks = await this.prisma.track.findMany({
      where,
      orderBy: [
        { episodeNumber: sort },
      ],
      skip: skip,
      take: pageSize,
      include: {
        artistEntity: true,
        albumEntity: true,
      },
    });

    return await this.attachProgressToTracks(tracks, userId || 1);
  }

  async getTrackCountByAlbum(
    albumName: string,
    artist: string,
    keyword?: string,
  ): Promise<number> {
    const where: any = {
      album: albumName,
      artist: artist,
    };

    if (keyword) {
      where.name = { contains: keyword };
    }

    return await this.prisma.track.count({
      where,
    });
  }

  async getTrackTableList(pageSize: number, current: number): Promise<Track[]> {
    return await this.prisma.track.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
      include: {
        artistEntity: true,
        albumEntity: true,
      },
    });
  }

  async loadMoreTrack(pageSize: number, loadCount: number): Promise<Track[]> {
    return await this.prisma.track.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
      include: {
        artistEntity: true,
        albumEntity: true,
      },
    });
  }

  async trackCount(type?: TrackType): Promise<number> {
    const where: any = {};
    if (type) {
      where.type = type;
    }
    return await this.prisma.track.count({ where });
  }

  async createTrack(track: Omit<Track, 'id'>): Promise<Track> {
    return await this.prisma.track.create({
      data: track,
    });
  }

  async updateTrack(id: number, track: Partial<Track>): Promise<Track> {
    return await this.prisma.track.update({
      where: { id },
      data: track,
    });
  }

  async deleteTrack(id: number): Promise<boolean> {
    const track = await this.prisma.track.findUnique({ where: { id } });
    if (track) {
      await this.deleteFileSafely(track.path);
    }
    await this.prisma.track.delete({
      where: { id },
    });
    return true;
  }

  // 批量新增
  async createTracks(tracks: Omit<Track, 'id'>[]): Promise<boolean> {
    const trackList = await this.prisma.track.createMany({
      data: tracks,
    });
    if (trackList.count !== tracks.length) {
      throw new Error('批量新增失败');
    }
    return trackList.count === tracks.length;
  }

  // 批量删除
  async deleteTracks(ids: number[]): Promise<boolean> {
    const tracks = await this.prisma.track.findMany({
      where: { id: { in: ids } },
    });
    for (const track of tracks) {
      await this.deleteFileSafely(track.path);
    }
    await this.prisma.track.deleteMany({
      where: { id: { in: ids } },
    });
    return true;
  }

  // 搜索单曲
  async searchTracks(keyword: string, type?: TrackType, limit: number = 10): Promise<Track[]> {
    return await this.prisma.track.findMany({
      where: {
        AND: [
          type ? { type } : {},
          {
            OR: [
              { name: { contains: keyword } },
              { artist: { contains: keyword } },
              { album: { contains: keyword } },
            ],
          },
        ],
      },
      take: limit,
      orderBy: { id: 'desc' },
      include: {
        artistEntity: true,
        albumEntity: true,
      },
    });
  }

  // 获取最新单曲
  async getLatestTracks(type?: TrackType, limit: number = 8): Promise<Track[]> {
    return await this.prisma.track.findMany({
      where: type ? { type } : {},
      take: limit,
      orderBy: { id: 'desc' },
      include: {
        artistEntity: true,
        albumEntity: true,
      },
    });
  }

  // 获取随机单曲
  async getRandomTracks(type?: TrackType, limit: number = 8): Promise<Track[]> {
    const count = await this.prisma.track.count({
      where: type ? { type } : {},
    });
    const skip = Math.max(0, Math.floor(Math.random() * (count - limit)));
    const tracks = await this.prisma.track.findMany({
      where: type ? { type } : {},
      skip,
      take: limit,
      include: {
        artistEntity: true,
        albumEntity: true,
      },
    });
    return tracks.sort(() => Math.random() - 0.5);
  }

  // 根据艺术家获取单曲
  async getTracksByArtist(artist: string): Promise<Track[]> {
    const tracks = await this.prisma.track.findMany({
      where: { artist },
      orderBy: { id: 'desc' },
      include: {
        artistEntity: true,
        albumEntity: true,
      },
    });
    return await this.attachProgressToTracks(tracks, 1);
  }

  // Helper: Attach progress to tracks
  private async attachProgressToTracks(tracks: Track[], userId: number): Promise<Track[]> {
    if (tracks.length === 0) return tracks;

    // Filter for audiobooks only to save DB calls?
    // Or just look up all? Only Audiobooks have UserAudiobookHistory.
    const audiobookTracks = tracks.filter(t => t.type === 'AUDIOBOOK');
    if (audiobookTracks.length === 0) return tracks;

    const trackIds = audiobookTracks.map(t => t.id);
    console.log('trackIds', trackIds), userId;
    const history = await this.prisma.userAudiobookHistory.findMany({
      where: {
        userId,
        trackId: { in: trackIds },
      },
      select: {
        trackId: true,
        progress: true,
      },
    });

    const historyMap = new Map(history.map(h => [h.trackId, h.progress]));

    return tracks.map(t => {
      if (t.type === 'AUDIOBOOK' && historyMap.has(t.id)) {
        return { ...t, progress: historyMap.get(t.id) };
      }
      return t;
    });
  }
}
