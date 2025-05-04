import { Injectable } from '@nestjs/common';
import { PrismaClient, UserAlbumLike } from '@prisma/client';

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

  async loadMoreUserAlbumLike(pageSize: number, loadCount: number) {
    return await this.prisma.userAlbumLike.findMany({
      skip: loadCount * pageSize,
      take: pageSize,
    });
  }

  async userAlbumLikeCount() {
    return await this.prisma.userAlbumLike.count();
  }
}
