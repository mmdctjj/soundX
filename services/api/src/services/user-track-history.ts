import { Injectable } from '@nestjs/common';
import { PrismaClient, UserTrackHistory } from '@soundx/db';

@Injectable()
export class UserTrackHistoryService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: UserTrackHistory) {
    // Check if the last history entry is for the same track and recent (e.g., within 1 hour)
    const lastHistory = await this.prisma.userTrackHistory.findFirst({
      where: { userId: data.userId },
      orderBy: { listenedAt: 'desc' },
    });

    if (lastHistory && lastHistory.trackId === data.trackId) {
      const diff = new Date().getTime() - new Date(lastHistory.listenedAt).getTime();
      // If less than 1 hour, update the existing record (progress, device, time)
      if (diff < 60 * 60 * 1000) {
        return await this.prisma.userTrackHistory.update({
          where: { id: lastHistory.id },
          data: {
            ...data,
            listenedAt: new Date(), // Update time to now to keep it fresh
          },
        });
      }
    }

    return await this.prisma.userTrackHistory.create({ data: { ...data, listenedAt: new Date() } });
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

  async getLatest(userId: number) {
    return await this.prisma.userTrackHistory.findFirst({
      where: { userId },
      orderBy: { listenedAt: 'desc' },
      include: { track: true },
    });
  }
}
