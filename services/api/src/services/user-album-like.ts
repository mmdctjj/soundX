import { Injectable } from '@nestjs/common';
import { PrismaClient, UserAlbumLike } from '@soundx/db';

@Injectable()
export class UserAlbumLikeService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: UserAlbumLike) {
    return await this.prisma.userAlbumLike.create({
      data,
    });
  }

  async findAll() {
    return await this.prisma.userAlbumLike.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.userAlbumLike.findUnique({
      where: { id },
    });
  }

  async remove(id: number) {
    return await this.prisma.userAlbumLike.delete({
      where: { id },
    });
  }

  async getUserAlbumLikeTableList(pageSize: number, current: number) {
    return await this.prisma.userAlbumLike.findMany({
      skip: (current - 1) * pageSize,
      take: pageSize,
    });
  }

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

  async userAlbumLikeCount() {
    return await this.prisma.userAlbumLike.count();
  }

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
