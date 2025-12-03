import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, UserAlbumLike } from '@soundx/db';
import { LogMethod } from '../common/log-method.decorator';

@Injectable()
export class UserAlbumLikeService {
  private readonly logger = new Logger(UserAlbumLikeService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  @LogMethod()
  async create(data: UserAlbumLike) {
    return await this.prisma.userAlbumLike.create({
      data,
    });
  }

  @LogMethod()
  async findAll() {
    return await this.prisma.userAlbumLike.findMany();
  }

  @LogMethod()
  async findOne(id: number) {
    return await this.prisma.userAlbumLike.findUnique({
      where: { id },
    });
  }

  @LogMethod()
  async remove(id: number) {
    return await this.prisma.userAlbumLike.delete({
      where: { id },
    });
  }

  @LogMethod()
  async getUserAlbumLikeTableList(pageSize: number, current: number) {
    return await this.prisma.userAlbumLike.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });
  }

  @LogMethod()
  async loadMoreUserAlbumLike(pageSize: number, loadCount: number, userId: number) {
    return await this.prisma.userAlbumLike.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
      where: { userId },
      include: {
        album: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  @LogMethod()
  async userAlbumLikeCount() {
    return await this.prisma.userAlbumLike.count();
  }

  @LogMethod()
  async removeByUserAndAlbum(userId: number, albumId: number) {
    const like = await this.prisma.userAlbumLike.findFirst({
      where: { userId, albumId },
    });
    if (like) {
      return await this.prisma.userAlbumLike.delete({
        where: { id: like.id },
      });
    }
    return null;
  }
}
