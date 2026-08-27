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
          take: 4,
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
        // 保留完整 tracks 列表——mobile 详情页用 FlatList 虚拟化（不分页），
        // 依赖 tracks 派生 photo wall（最多 11 个独特专辑封面）等。web 端如需分页请走 findTracksPaged。
        tracks: {
          include: {
            artistEntity: true,
            albumEntity: true,
            likedByUsers: true,
          },
        },
      },
    });
  }

  /**
   * 分页加载 playlist 内的 tracks。
   * - prisma schema 中 Playlist <-> Track 是 implicit M:N 关系，没有显式 PlaylistTrack 中间表与 position 字段；
   *   因此这里直接通过 relation include + skip/take 实现分页，orderBy 沿用 id desc（与 getTracksByArtist 一致）。
   * - skip/pageSize 由前端 useLoadMore 控制（默认 100）
   * - 返回 { list, total, hasMore }
   */
  async findTracksPaged(id: number, skip: number, pageSize: number) {
    const safeSkip = Math.max(0, Number.isFinite(skip) ? skip : 0);
    const safePageSize = Math.min(Math.max(1, Number.isFinite(pageSize) ? pageSize : 100), 500);

    const [total, list] = await this.prisma.$transaction([
      this.prisma.track.count({
        where: {
          playlists: {
            some: { id },
          },
        },
      }),
      this.prisma.playlist.findUnique({
        where: { id },
        select: {
          tracks: {
            skip: safeSkip,
            take: safePageSize,
            orderBy: { id: 'desc' },
            include: {
              artistEntity: true,
              albumEntity: true,
              likedByUsers: true,
            },
          },
        },
      }),
    ]);

    const tracks = list?.tracks ?? [];
    return {
      list: tracks,
      total,
      hasMore: safeSkip + tracks.length < total,
    };
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

  async addTracks(playlistId: number, trackIds: number[]) {
    return await this.prisma.playlist.update({
      where: { id: playlistId },
      data: {
        tracks: {
          connect: trackIds.map((id) => ({ id })),
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
