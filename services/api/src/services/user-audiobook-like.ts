import { Injectable } from '@nestjs/common';
import { PrismaClient, UserAudiobookLike } from '@soundx/db';

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

  async loadMoreUserAudiobookLike(pageSize: number, loadCount: number) {
    return await this.prisma.userAudiobookLike.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
    });
  }

  async userAudiobookLikeCount() {
    return await this.prisma.userAudiobookLike.count();
  }

  async getUserAudiobookLikeTableList(pageSize: number, current: number) {
    return await this.prisma.userAudiobookLike.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });
  }

  async remove(id: number) {
    return await this.prisma.userAudiobookLike.delete({
      where: { id },
    });
  }
}
