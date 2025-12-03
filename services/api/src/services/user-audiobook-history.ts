import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, UserAudiobookHistory } from '@soundx/db';
import { LogMethod } from '../common/log-method.decorator';

@Injectable()
export class UserAudiobookHistoryService {
  private readonly logger = new Logger(UserAudiobookHistoryService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  @LogMethod()
  async create(data: UserAudiobookHistory) {
    return await this.prisma.userAudiobookHistory.create({
      data,
    });
  }

  @LogMethod()
  async findAll() {
    return await this.prisma.userAudiobookHistory.findMany();
  }

  @LogMethod()
  async findOne(id: number) {
    return await this.prisma.userAudiobookHistory.findUnique({
      where: { id },
    });
  }

  @LogMethod()
  async remove(id: number) {
    return await this.prisma.userAudiobookHistory.delete({
      where: { id },
    });
  }

  @LogMethod()
  async getUserAudiobookHistoryTableList(pageSize: number, current: number) {
    return await this.prisma.userAudiobookHistory.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });
  }

  @LogMethod()
  async loadMoreUserAudiobookHistory(pageSize: number, loadCount: number) {
    return await this.prisma.userAudiobookHistory.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
    });
  }

  @LogMethod()
  async userAudiobookHistoryCount() {
    return await this.prisma.userAudiobookHistory.count();
  }
}
