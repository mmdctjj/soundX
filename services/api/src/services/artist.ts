import { Injectable, Logger } from '@nestjs/common';
import { Artist, PrismaClient, TrackType } from '@soundx/db';
import { LogMethod } from '../common/log-method.decorator';

@Injectable()
export class ArtistService {
  private readonly logger = new Logger(ArtistService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  @LogMethod()
  async getArtistList(): Promise<Artist[]> {
    return await this.prisma.artist.findMany();
  }

  @LogMethod()
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

  @LogMethod()
  async getArtistById(id: number): Promise<Artist | null> {
    return await this.prisma.artist.findUnique({ where: { id } });
  }

  @LogMethod()
  async getArtistTableList(
    pageSize: number,
    current: number,
  ): Promise<Artist[]> {
    return await this.prisma.artist.findMany({
      skip: (current - 1) * pageSize, // 计算要跳过多少条
      take: pageSize,
    });
  }

  @LogMethod()
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

  @LogMethod()
  async artistCount(): Promise<number> {
    return await this.prisma.artist.count();
  }

  @LogMethod()
  async createArtist(artist: Omit<Artist, 'id'>): Promise<Artist> {
    return await this.prisma.artist.create({
      data: artist,
    });
  }

  @LogMethod()
  async updateArtist(id: number, artist: Partial<Artist>): Promise<Artist> {
    return await this.prisma.artist.update({
      where: { id },
      data: artist,
    });
  }

  @LogMethod()
  async deleteArtist(id: number): Promise<boolean> {
    await this.prisma.artist.delete({
      where: { id },
    });
    return true;
  }

  // 批量新增
  @LogMethod()
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
  @LogMethod()
  async deleteArtists(ids: number[]): Promise<boolean> {
    await this.prisma.artist.deleteMany({
      where: { id: { in: ids } },
    });
    return true;
  }

  // 搜索艺术家
  @LogMethod()
  async searchArtists(
    keyword: string,
    type?: TrackType,
    limit: number = 10
  ): Promise<Artist[]> {

    return await this.prisma.artist.findMany({
      where: {
        AND: [
          type ? { type } : {},
          {
            OR: [
              { name: { contains: keyword } },
            ],
          },
        ],
      },
      take: limit,
      orderBy: { id: 'desc' },
    });
  }

  // 获取最近的艺术家
  @LogMethod()
  async getLatestArtists(limit: number = 8, type: TrackType): Promise<Artist[]> {
    return await this.prisma.artist.findMany({
      take: limit,
      where: {
        type,
      },
      orderBy: { id: 'desc' }, // Assuming higher ID means newer, or use createdAt if available
    });
  }
}
