import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, UserTrackLike } from '@soundx/db';
import { LogMethod } from '../common/log-method.decorator';

@Injectable()
export class UserTrackLikeService {
  private readonly logger = new Logger(UserTrackLikeService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  @LogMethod()
  async create(data: UserTrackLike) {
    return await this.prisma.userTrackLike.create({
      data,
    });
  }

  @LogMethod()
  async findAll() {
    return await this.prisma.userTrackLike.findMany();
  }

  @LogMethod()
  async findOne(id: number) {
    return await this.prisma.userTrackLike.findUnique({
      where: { id },
    });
  }

  @LogMethod()
  async remove(id: number) {
    return await this.prisma.userTrackLike.delete({
      where: { id },
    });
  }

  @LogMethod()
  async getUserTrackLikeTableList(page: number, pageSize: number) {
    return await this.prisma.userTrackLike.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  @LogMethod()
  async loadMoreUserTrackLike(loadCount: number, pageSize: number, userId: number) {
    return await this.prisma.userTrackLike.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      distinct: ['trackId'],
      include: {
        track: true,
      },
    });
  }

  @LogMethod()
  async userTrackLikeCount(): Promise<number> {
    return await this.prisma.userTrackLike.count();
  }
}
