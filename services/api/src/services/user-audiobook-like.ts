import { Injectable } from '@nestjs/common';
import { PrismaClient, UserAudiobookLike } from '@prisma/client';

@Injectable()
export class UserAudiobookLikeService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: UserAudiobookLike) {
    return await this.prisma.userAudiobookLike.create({
      data,
    });
  }

  async findAll() {
    return await this.prisma.userAudiobookLike.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.userAudiobookLike.findUnique({
      where: { id },
    });
  }

  async remove(id: number) {
    return await this.prisma.userAudiobookLike.delete({
      where: { id },
    });
  }
}
