import { Injectable } from '@nestjs/common';
import { PrismaClient, UserAudiobookHistory } from '@soundx/db';

@Injectable()
export class UserAudiobookHistoryService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: UserAudiobookHistory) {
    return await this.prisma.userAudiobookHistory.create({
      data,
    });
  }

  async findAll() {
    return await this.prisma.userAudiobookHistory.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.userAudiobookHistory.findUnique({
      where: { id },
    });
  }

  async remove(id: number) {
    return await this.prisma.userAudiobookHistory.delete({
      where: { id },
    });
  }

  async getUserAudiobookHistoryTableList(pageSize: number, current: number) {
    return await this.prisma.userAudiobookHistory.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });
  }

  async loadMoreUserAudiobookHistory(pageSize: number, loadCount: number) {
    return await this.prisma.userAudiobookHistory.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
    });
  }

  async userAudiobookHistoryCount() {
    return await this.prisma.userAudiobookHistory.count();
  }
}
