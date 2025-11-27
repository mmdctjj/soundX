import { Injectable } from '@nestjs/common';
import { Album, PrismaClient } from '@soundx/db';

@Injectable()
export class AlbumService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getAlbumList(): Promise<Album[]> {
    return await this.prisma.album.findMany();
  }

  async findByName(name: string, artist?: string, type?: any): Promise<Album | null> {
    return await this.prisma.album.findFirst({ where: { name, artist, type } });
  }

  async getAlbumTableList(pageSize: number, current: number): Promise<Album[]> {
    return await this.prisma.album.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });
  }

  async loadMoreAlbum(pageSize: number, loadCount: number): Promise<Album[]> {
    return await this.prisma.album.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
    });
  }

  async albumCount(): Promise<number> {
    return await this.prisma.album.count();
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

  // 新增：最近专辑（按 id 倒序）
  async getLatestAlbums(limit = 8, type?: any): Promise<Album[]> {
    return await this.prisma.album.findMany({
      where: type ? { type } : undefined,
      orderBy: { id: 'desc' },
      take: limit,
    });
  }

  // 随机推荐：用户未听过的专辑
  async getRandomUnlistenedAlbums(userId: number, limit = 8, type?: any): Promise<Album[]> {
    const listened = await this.prisma.userAlbumHistory.findMany({
      where: { userId },
      select: { albumId: true },
    });
    const listenedIds = listened.map((r) => r.albumId);

    const whereClause: any = listenedIds.length ? { id: { notIn: listenedIds } } : {};
    if (type) {
      whereClause.type = type;
    }

    const candidates = await this.prisma.album.findMany({
      where: whereClause,
    });

    if (candidates.length <= limit) return candidates;

    const shuffled = candidates.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  }
}
