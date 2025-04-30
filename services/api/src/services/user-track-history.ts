import { Injectable } from '@nestjs/common';
import { PrismaClient, UserTrackHistory } from '@prisma/client';

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
}
