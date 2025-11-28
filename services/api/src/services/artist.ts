import { Injectable } from '@nestjs/common';
import { Artist, PrismaClient } from '@soundx/db';

@Injectable()
export class ArtistService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getArtistList(): Promise<Artist[]> {
    return await this.prisma.artist.findMany();
  }

  async findByName(name: string, type?: any): Promise<Artist | null> {
    // Don't search if name is null
    if (name === null || name === undefined) {
      return null;
    }
    const where: any = { name };
    if (type) {
      where.type = type;
    }
    return await this.prisma.artist.findFirst({ where });
  }

  async getArtistById(id: number): Promise<Artist | null> {
    return await this.prisma.artist.findUnique({ where: { id } });
  }

  async getArtistTableList(
    pageSize: number,
    current: number,
  ): Promise<Artist[]> {
    return await this.prisma.artist.findMany({
      skip: (current - 1) * pageSize, // 计算要跳过多少条
      take: pageSize,
    });
  }

  async loadMoreArtist(
    pageSize: number,
    loadCount: number,
    type?: any,
  ): Promise<Artist[]> {
    const where: any = {};
    if (type) {
      where.type = type;
    }
    return await this.prisma.artist.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
      where,
    });
  }

  async artistCount(): Promise<number> {
    return await this.prisma.artist.count();
  }

  async createArtist(artist: Omit<Artist, 'id'>): Promise<Artist> {
    return await this.prisma.artist.create({
      data: artist,
    });
  }

  async updateArtist(id: number, artist: Partial<Artist>): Promise<Artist> {
    return await this.prisma.artist.update({
      where: { id },
      data: artist,
    });
  }

  async deleteArtist(id: number): Promise<boolean> {
    await this.prisma.artist.delete({
      where: { id },
    });
    return true;
  }

  // 批量新增
  async createArtists(artists: Omit<Artist, 'id'>[]): Promise<boolean> {
    const artistList = await this.prisma.artist.createMany({
      data: artists,
    });
    if (artistList.count !== artists.length) {
      throw new Error('批量新增失败');
    }
    return artistList.count === artists.length;
  }

  // 批量删除
  async deleteArtists(ids: number[]): Promise<boolean> {
    await this.prisma.artist.deleteMany({
      where: { id: { in: ids } },
    });
    return true;
  }
}
