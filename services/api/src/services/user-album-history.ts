import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, UserAlbumHistory } from '@soundx/db';
import { LogMethod } from '../common/log-method.decorator';

@Injectable()
export class UserAlbumHistoryService {
  private readonly logger = new Logger(UserAlbumHistoryService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  @LogMethod()
  async create(data: UserAlbumHistory) {
    return await this.prisma.userAlbumHistory.create({
      data,
    });
  }

  @LogMethod()
  async findAll() {
    return await this.prisma.userAlbumHistory.findMany();
  }

  @LogMethod()
  async findOne(id: number) {
    return await this.prisma.userAlbumHistory.findUnique({
      where: { id },
    });
  }

  @LogMethod()
  async remove(id: number) {
    return await this.prisma.userAlbumHistory.delete({
      where: { id },
    });
  }

  @LogMethod()
  async getUserAlbumHistoryTableList(pageSize: number, current: number) {
    return await this.prisma.userAlbumHistory.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });
  }

  @LogMethod()
  async loadMoreUserAlbumHistory(pageSize: number, loadCount: number, userId: number) {
    const list = await this.prisma.userAlbumHistory.findMany({
      where: { userId },
      orderBy: {
        // 按 albumId 分组后，每组按 listenedAt 最大值排序
        listenedAt: 'desc',
      },

      // 每个 albumId 只保留最新一条
      distinct: ['albumId'],

      skip: loadCount * pageSize,
      take: pageSize,

      include: {
        album: true, // 带出专辑信息
      },
    });

    return list;
  }


  @LogMethod()
  async userAlbumHistoryCount(userId?: number) {
    if (userId) {
      // Count unique albums for the user
      const uniqueAlbums = await this.prisma.userAlbumHistory.groupBy({
        by: ['albumId'],
        where: { userId },
      });
      return uniqueAlbums.length;
    }
    return await this.prisma.userAlbumHistory.count();
  }
}
