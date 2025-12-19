import { Injectable } from '@nestjs/common';
import { PrismaClient, UserTrackLike } from '@soundx/db';

@Injectable()
export class UserTrackLikeService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: UserTrackLike) {
    return await this.prisma.userTrackLike.create({
      data,
    });
  }

  async findAll() {
    return await this.prisma.userTrackLike.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.userTrackLike.findUnique({
      where: { id },
    });
  }

  async remove(id: number) {
    return await this.prisma.userTrackLike.delete({
      where: { id },
    });
  }

  async getUserTrackLikeTableList(page: number, pageSize: number) {
    return await this.prisma.userTrackLike.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async loadMoreUserTrackLike(loadCount: number, pageSize: number, userId: number, type?: string) {
    return await this.prisma.userTrackLike.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
      where: { 
        userId,
        track: type ? { type: type as any } : undefined,
      },
      orderBy: {
        createdAt: 'desc',
      },
      distinct: ['trackId'],
      include: {
        track: true,
      },
    });
  }

  async userTrackLikeCount(): Promise<number> {
    return await this.prisma.userTrackLike.count();
  }

  async removeByUserAndTrack(userId: number, trackId: number) {
    return await this.prisma.userTrackLike.deleteMany({
      where: {
        userId,
        trackId,
      },
    });
  }
}
