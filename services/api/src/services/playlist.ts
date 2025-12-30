import { Injectable } from '@nestjs/common';
import { PrismaClient, TrackType } from '@soundx/db';

@Injectable()
export class PlaylistService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: any) {
    console.log(data);
    return await this.prisma.playlist.create({
      data,
    });
  }

  async findAll(userId: number, type?: TrackType) {
    return await this.prisma.playlist.findMany({
      where: {
        userId,
        type,
      },
      include: {
        tracks: {
          take: 3,
          select: { id: true, cover: true },
        },
        _count: {
          select: { tracks: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        tracks: true,
      },
    });
  }

  async update(id: number, data: any) {
    return await this.prisma.playlist.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return await this.prisma.playlist.delete({
      where: { id },
    });
  }

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
