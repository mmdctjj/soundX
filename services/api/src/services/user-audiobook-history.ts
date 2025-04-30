import { Injectable } from '@nestjs/common';
import { PrismaClient, UserAudiobookHistory } from '@prisma/client';

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
}
