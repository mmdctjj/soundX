import { Injectable } from '@nestjs/common';
import { PrismaClient, Track, TrackType } from '@soundx/db';

@Injectable()
export class TrackService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getTrackList(): Promise<Track[]> {
    return await this.prisma.track.findMany();
  }

  async getTracksByAlbum(
    albumName: string,
    artist: string,
    pageSize: number,
    skip: number,
    sort: 'asc' | 'desc' = 'asc',
    keyword?: string,
  ): Promise<Track[]> {
    const where: any = {
      album: albumName,
      artist: artist,
    };

    if (keyword) {
      where.name = { contains: keyword };
    }

    return await this.prisma.track.findMany({
      where,
      orderBy: [
        { index: sort }, // Primary sort by track index
        {
          id: sort,
        }
      ],
      skip: skip,
      take: pageSize,
    });
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
    });
  }

  async loadMoreTrack(pageSize: number, loadCount: number): Promise<Track[]> {
    return await this.prisma.track.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
    });
  }

  async trackCount(): Promise<number> {
    return await this.prisma.track.count();
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
    });
  }

  // 获取最新单曲
  async getLatestTracks(type?: TrackType, limit: number = 8): Promise<Track[]> {
    return await this.prisma.track.findMany({
      where: type ? { type } : {},
      take: limit,
      orderBy: { id: 'desc' },
    });
  }

  // 根据艺术家获取单曲
  async getTracksByArtist(artist: string): Promise<Track[]> {
    return await this.prisma.track.findMany({
      where: { artist },
      orderBy: { id: 'desc' },
    });
  }
}
