import { Injectable } from '@nestjs/common';
import { PrismaClient, Track } from '@prisma/client';

@Injectable()
export class TrackService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getTrackList(): Promise<Track[]> {
    return await this.prisma.track.findMany();
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
}
