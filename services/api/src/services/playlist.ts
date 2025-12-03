import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, TrackType } from '@soundx/db';
import { LogMethod } from '../common/log-method.decorator';

@Injectable()
export class PlaylistService {
  private readonly logger = new Logger(PlaylistService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  @LogMethod()
  async create(data: any) {
    console.log(data);
    return await this.prisma.playlist.create({
      data,
    });
  }

  @LogMethod()
  async findAll(userId: number, type?: TrackType) {
    return await this.prisma.playlist.findMany({
      where: {
        userId,
        type,
      },
      include: {
        _count: {
          select: { tracks: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  @LogMethod()
  async findOne(id: number) {
    return await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        tracks: true,
      },
    });
  }

  @LogMethod()
  async update(id: number, data: any) {
    return await this.prisma.playlist.update({
      where: { id },
      data,
    });
  }

  @LogMethod()
  async remove(id: number) {
    return await this.prisma.playlist.delete({
      where: { id },
    });
  }

  @LogMethod()
  async addTrack(playlistId: number, trackId: number) {
    return await this.prisma.playlist.update({
      where: { id: playlistId },
      data: {
        tracks: {
          connect: { id: trackId },
        },
      },
    });
  }

  @LogMethod()
  async removeTrack(playlistId: number, trackId: number) {
    return await this.prisma.playlist.update({
      where: { id: playlistId },
      data: {
        tracks: {
          disconnect: { id: trackId },
        },
      },
    });
  }
}
