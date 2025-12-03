import { Injectable } from '@nestjs/common';
import { PrismaClient, UserTrackHistory } from '@soundx/db';

@Injectable()
export class UserTrackHistoryService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: UserTrackHistory) {
    return await this.prisma.userTrackHistory.create({
      data,
    });
  }

  async findAll() {
    return await this.prisma.userTrackHistory.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.userTrackHistory.findUnique({
      where: { id },
    });
  }

  async remove(id: number) {
    return await this.prisma.userTrackHistory.delete({
      where: { id },
    });
  }

  async getUserTrackHistoryTableList(pageSize: number, current: number) {
    return await this.prisma.userTrackHistory.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });
  }

  async loadMoreUserTrackHistory(pageSize: number, loadCount: number, userId: number) {
    return await this.prisma.userTrackHistory.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
      where: { userId },
      include: {
        track: true,
      },
      distinct: ['trackId'],
      orderBy: {
        listenedAt: 'desc',
      },
    });
  }

  async userTrackHistoryCount(userId: number) {
    return await this.prisma.userTrackHistory.count({ where: { userId } });
  }
}
