import { Injectable, Logger } from '@nestjs/common';
import { Album, PrismaClient } from '@soundx/db';
import { LogMethod } from '../common/log-method.decorator';

@Injectable()
export class AlbumService {
  private readonly logger = new Logger(AlbumService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  @LogMethod()
  async getAlbumList(): Promise<Album[]> {
    return await this.prisma.album.findMany();
  }

  @LogMethod()
  async findByName(name: string, artist?: string, type?: any): Promise<Album | null> {
    // Build where clause dynamically to avoid null matching issues
    const where: any = {};

    if (name !== null && name !== undefined) {
      where.name = name;
    }
    if (artist !== null && artist !== undefined) {
      where.artist = artist;
    }
    if (type !== null && type !== undefined) {
      where.type = type;
    }

    return await this.prisma.album.findFirst({ where });
  }

  @LogMethod()
  async getAlbumsByArtist(artist: string): Promise<Album[]> {
    return await this.prisma.album.findMany({ where: { artist } });
  }

  @LogMethod()
  async getAlbumById(id: number): Promise<Album | null> {
    return await this.prisma.album.findUnique({ where: { id }, include: { likedByUsers: true, listenedByUsers: true } });
  }

  @LogMethod()
  async getAlbumTableList(pageSize: number, current: number): Promise<Album[]> {
    return await this.prisma.album.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });
  }

  @LogMethod()
  async loadMoreAlbum(pageSize: number, loadCount: number, type?: any): Promise<Album[]> {
    return await this.prisma.album.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
      where: { type },
    });
  }

  @LogMethod()
  async albumCount(): Promise<number> {
    return await this.prisma.album.count();
  }

  @LogMethod()
  async createAlbum(album: Omit<Album, 'id'>): Promise<Album> {
    return await this.prisma.album.create({
      data: album,
    });
  }

  @LogMethod()
  async updateAlbum(id: number, album: Partial<Album>): Promise<Album> {
    return await this.prisma.album.update({
      where: { id },
      data: album,
    });
  }

  @LogMethod()
  async deleteAlbum(id: number): Promise<boolean> {
    await this.prisma.album.delete({
      where: { id },
    });
    return true;
  }

  // 批量新增
  @LogMethod()
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
  @LogMethod()
  async deleteAlbums(ids: number[]): Promise<boolean> {
    await this.prisma.album.deleteMany({
      where: { id: { in: ids } },
    });
    return true;
  }

  // 新增：最近专辑（按 id 倒序）
  @LogMethod()
  async getLatestAlbums(limit = 8, type?: any): Promise<Album[]> {
    return await this.prisma.album.findMany({
      where: type ? { type } : undefined,
      orderBy: { id: 'desc' },
      take: limit,
    });
  }

  // 随机推荐：用户未听过的专辑
  @LogMethod()
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

  // 搜索专辑
  @LogMethod()
  async searchAlbums(keyword: string, type?: any, limit: number = 10): Promise<Album[]> {
    const where: any = {
      OR: [
        { name: { contains: keyword } },
        { artist: { contains: keyword } },
      ],
    };

    if (type) {
      where.type = type;
    }

    return await this.prisma.album.findMany({
      where,
      take: limit,
      orderBy: { id: 'desc' },
    });
  }
}
