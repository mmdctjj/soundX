import { Injectable } from '@nestjs/common';
import { PrismaClient, UserAlbumHistory } from '@soundx/db';

@Injectable()
export class UserAlbumHistoryService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: UserAlbumHistory) {
    return await this.prisma.userAlbumHistory.create({
      data,
    });
  }

  async findAll() {
    return await this.prisma.userAlbumHistory.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.userAlbumHistory.findUnique({
      where: { id },
    });
  }

  async remove(id: number) {
    return await this.prisma.userAlbumHistory.delete({
      where: { id },
    });
  }

  async getUserAlbumHistoryTableList(pageSize: number, current: number) {
    return await this.prisma.userAlbumHistory.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });
  }

  async loadMoreUserAlbumHistory(pageSize: number, loadCount: number) {
    return await this.prisma.userAlbumHistory.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
    });
  }

  async userAlbumHistoryCount() {
    return await this.prisma.userAlbumHistory.count();
  }
}
