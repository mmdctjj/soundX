import { Injectable } from '@nestjs/common';
import { Artist, PrismaClient } from '@prisma/client';

@Injectable()
export class ArtistService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getArtistList(): Promise<Artist[]> {
    return await this.prisma.artist.findMany();
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
