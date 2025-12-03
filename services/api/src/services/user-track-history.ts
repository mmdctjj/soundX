import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, UserTrackHistory } from '@soundx/db';
import { LogMethod } from '../common/log-method.decorator';

@Injectable()
export class UserTrackHistoryService {
  private readonly logger = new Logger(UserTrackHistoryService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  @LogMethod()
  async create(data: UserTrackHistory) {
    return await this.prisma.userTrackHistory.create({
      data,
    });
  }

  @LogMethod()
  async findAll() {
    return await this.prisma.userTrackHistory.findMany();
  }

  @LogMethod()
  async findOne(id: number) {
    return await this.prisma.userTrackHistory.findUnique({
      where: { id },
    });
  }

  @LogMethod()
  async remove(id: number) {
    return await this.prisma.userTrackHistory.delete({
      where: { id },
    });
  }

  @LogMethod()
  async getUserTrackHistoryTableList(pageSize: number, current: number) {
    return await this.prisma.userTrackHistory.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });
  }

  @LogMethod()
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

  @LogMethod()
  async userTrackHistoryCount(userId: number) {
    return await this.prisma.userTrackHistory.count({ where: { userId } });
  }
}
