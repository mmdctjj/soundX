import { Injectable } from '@nestjs/common';
import { Track } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TrackService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getTrackList(): Promise<Track[]> {
    return await this.prisma.track.findMany();
  }

  async createTrack(track: Omit<Track, 'id' | 'createdAt'>): Promise<Track> {
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
}
