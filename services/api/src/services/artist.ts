import { Injectable } from '@nestjs/common';
import { Artist } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

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
}
