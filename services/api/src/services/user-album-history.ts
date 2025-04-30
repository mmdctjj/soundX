import { Injectable } from '@nestjs/common';
import { PrismaClient, UserAlbumHistory } from '@prisma/client';

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
}
