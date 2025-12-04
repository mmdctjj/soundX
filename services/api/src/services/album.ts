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

  async getAlbumsByArtist(artist: string): Promise<Album[]> {
    return await this.prisma.album.findMany({ where: { artist } });
  }

  async getAlbumById(id: number): Promise<Album | null> {
    return await this.prisma.album.findUnique({ where: { id }, include: { likedByUsers: true, listenedByUsers: true } });
  }

  async getAlbumTableList(pageSize: number, current: number): Promise<Album[]> {
    return await this.prisma.album.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });
  }

  async loadMoreAlbum(pageSize: number, loadCount: number, type?: any): Promise<Album[]> {
    const result = await this.prisma.album.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
      where: { type },
    });

    if (type === 'AUDIOBOOK') {
      return await this.attachProgressToAlbums(result, 1); // Default userId 1
    }

    return result;
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
    const result = await this.prisma.album.findMany({
      where: type ? { type } : undefined,
      orderBy: { id: 'desc' },
      take: limit,
    });

    if (type === 'AUDIOBOOK') {
      return await this.attachProgressToAlbums(result, 1); // Default userId 1
    }

    return result;
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
    const result = shuffled.slice(0, limit);

    if (type === 'AUDIOBOOK') {
      return await this.attachProgressToAlbums(result, userId);
    }

    return result;
  }

  // 搜索专辑
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

    const albums = await this.prisma.album.findMany({
      where,
      take: limit,
      orderBy: { id: 'desc' },
    });

    if (type === 'AUDIOBOOK') {
      return await this.attachProgressToAlbums(albums, 1); // Default userId 1
    }
    return albums;
  }

  // Helper: Attach progress to audiobook albums
  private async attachProgressToAlbums(albums: Album[], userId: number): Promise<Album[]> {
    if (albums.length === 0) return albums;

    const albumNames = albums.map(a => a.name);
    const artists = albums.map(a => a.artist);

    // 1. Fetch all tracks for these albums to calculate total duration
    const tracks = await this.prisma.track.findMany({
      where: {
        album: { in: albumNames },
        artist: { in: artists },
        type: 'AUDIOBOOK',
      },
      select: {
        id: true,
        album: true,
        artist: true,
        duration: true,
      },
    });

    // 2. Fetch user's listening history for these tracks
    const trackIds = tracks.map(t => t.id);
    const history = await this.prisma.userAudiobookHistory.findMany({
      where: {
        userId,
        trackId: { in: trackIds },
      },
      select: {
        trackId: true,
      },
    });
    const listenedTrackIds = new Set(history.map(h => h.trackId));

    // 3. Calculate progress per album
    return albums.map(album => {
      const albumTracks = tracks.filter(t => t.album === album.name && t.artist === album.artist);
      if (albumTracks.length === 0) return { ...album, progress: 0 };

      const totalDuration = albumTracks.reduce((sum, t) => sum + (t.duration || 0), 0);
      if (totalDuration === 0) return { ...album, progress: 0 };

      const listenedDuration = albumTracks
        .filter(t => listenedTrackIds.has(t.id))
        .reduce((sum, t) => sum + (t.duration || 0), 0);

      const progress = Math.min(100, Math.round((listenedDuration / totalDuration) * 100));
      return { ...album, progress };
    });
  }
}
