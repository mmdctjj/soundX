import { Injectable } from '@nestjs/common';
import { Mv, PrismaClient } from '@soundx/db';
import { toSimplified } from '../common/zh-utils';

@Injectable()
export class MvService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getMvList(
    pageSize: number = 20,
    skip: number = 0,
    keyword?: string
  ): Promise<{ data: Mv[], total: number }> {
    const where: any = {
      status: 'ACTIVE',
    };

    if (keyword) {
      const simplifiedKeyword = toSimplified(keyword);
      where.OR = [
        { name: { contains: simplifiedKeyword } },
        { artist: { contains: simplifiedKeyword } },
        { album: { contains: simplifiedKeyword } }
      ];
    }

    const total = await this.prisma.mv.count({ where });
    const data = await this.prisma.mv.findMany({
      where,
      orderBy: { id: 'desc' },
      skip,
      take: pageSize,
    });

    return { data, total };
  }

  async getMvById(id: number): Promise<Mv | null> {
    return await this.prisma.mv.findFirst({
      where: { id, status: 'ACTIVE' },
      include: {
        artistEntity: true,
        albumEntity: true,
        trackEntity: true
      }
    });
  }

  async getMvsByArtist(artist: string): Promise<Mv[]> {
    const mvs = await this.prisma.mv.findMany({
      where: { 
        artist: { contains: artist },
        status: 'ACTIVE' 
      },
      orderBy: { id: 'desc' },
    });

    const artistDelimiters = /[&,、]|\s+and\s+/i;
    const filteredMvs = mvs.filter(m => {
       if (m.artist === artist) return true;
       if (!m.artist) return false;
       const parts = m.artist.split(artistDelimiters).map(s => s.trim());
       return parts.includes(artist);
    });

    return filteredMvs;
  }

  async getMvsByAlbum(album: string, artist: string): Promise<Mv[]> {
    return await this.prisma.mv.findMany({
      where: { 
        album,
        artist,
        status: 'ACTIVE' 
      },
      orderBy: { id: 'desc' },
    });
  }

  async getMvByTrack(trackId: number): Promise<Mv | null> {
    return await this.prisma.mv.findFirst({
      where: { 
        trackId,
        status: 'ACTIVE' 
      },
      orderBy: { id: 'desc' }
    });
  }

  async getRandomMvs(limit: number = 8): Promise<Mv[]> {
    const where: any = {
        status: 'ACTIVE',
    };
    
    const count = await this.prisma.mv.count({ where });
    const skip = Math.max(0, Math.floor(Math.random() * (count - limit)));
    const mvs = await this.prisma.mv.findMany({
      where,
      skip,
      take: limit,
    });
    return mvs.sort(() => Math.random() - 0.5);
  }
}
