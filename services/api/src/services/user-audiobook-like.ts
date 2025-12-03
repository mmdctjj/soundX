import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, UserAudiobookLike } from '@soundx/db';
import { LogMethod } from '../common/log-method.decorator';

@Injectable()
export class UserAudiobookLikeService {
  private readonly logger = new Logger(UserAudiobookLikeService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  @LogMethod()
  async create(data: UserAudiobookLike) {
    return await this.prisma.userAudiobookLike.create({
      data,
    });
  }

  @LogMethod()
  async findAll() {
    return await this.prisma.userAudiobookLike.findMany();
  }

  @LogMethod()
  async findOne(id: number) {
    return await this.prisma.userAudiobookLike.findUnique({
      where: { id },
    });
  }

  @LogMethod()
  async loadMoreUserAudiobookLike(pageSize: number, loadCount: number) {
    return await this.prisma.userAudiobookLike.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
    });
  }

  @LogMethod()
  async userAudiobookLikeCount() {
    return await this.prisma.userAudiobookLike.count();
  }

  @LogMethod()
  async getUserAudiobookLikeTableList(pageSize: number, current: number) {
    return await this.prisma.userAudiobookLike.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });
  }

  @LogMethod()
  async remove(id: number) {
    return await this.prisma.userAudiobookLike.delete({
      where: { id },
    });
  }
}
