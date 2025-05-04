import { Injectable } from '@nestjs/common';
import { PrismaClient, UserTrackLike } from '@prisma/client';

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

  async loadMoreUserTrackLike(lastId: number, pageSize: number) {
    return await this.prisma.userTrackLike.findMany({
      where: { id: { gt: lastId } },
      take: pageSize,
      orderBy: { id: 'asc' },
    });
  }

  async userTrackLikeCount(): Promise<number> {
    return await this.prisma.userTrackLike.count();
  }
}
