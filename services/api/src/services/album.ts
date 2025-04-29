import { Injectable } from '@nestjs/common';
import { Album, PrismaClient } from '@prisma/client';

@Injectable()
export class AlbumService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getAlbumList(): Promise<Album[]> {
    return await this.prisma.album.findMany();
  }

  async createAlbum(album: Omit<Album, 'id'>): Promise<Album> {
    return await this.prisma.album.create({
      data: album,
    });
  }

  async updateAlbum(id: number, album: Partial<Album>): Promise<Album> {
    return await this.prisma.album.update({
      where: { id },
      data: album,
    });
  }

  async deleteAlbum(id: number): Promise<boolean> {
    await this.prisma.album.delete({
      where: { id },
    });
    return true;
  }

  // 批量新增
  async createAlbums(albums: Omit<Album, 'id'>[]): Promise<boolean> {
    const albumList = await this.prisma.album.createMany({
      data: albums,
    });
    if (albumList.count !== albums.length) {
      throw new Error('批量新增失败');
    }
    return albumList.count === albums.length;
  }

  // 批量删除
  async deleteAlbums(ids: number[]): Promise<boolean> {
    await this.prisma.album.deleteMany({
      where: { id: { in: ids } },
    });
    return true;
  }
}
