import { Injectable } from '@nestjs/common';
import { PrismaClient, User } from '@soundx/db';

@Injectable()
export class UserService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }
  getHello(): string {
    return 'Hello World!';
  }
  async getUserList(): Promise<User[]> {
    return await this.prisma.user.findMany();
  }

  async getUserTableList(page: number, pageSize: number) {
    return await this.prisma.user.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async loadMoreUser(lastId: number, pageSize: number) {
    return await this.prisma.user.findMany({
      where: { id: { gt: lastId } },
      take: pageSize,
      orderBy: { id: 'asc' },
    });
  }

  async userCount(): Promise<number> {
    return await this.prisma.user.count();
  }
  async createUser(user: Omit<User, 'id'>): Promise<User> {
    return await this.prisma.user.create({
      data: user,
    });
  }

  async updateUser(id: number, user: Partial<User>): Promise<User> {
    return await this.prisma.user.update({
      where: { id },
      data: user,
    });
  }

  async deleteUser(id: number): Promise<boolean> {
    await this.prisma.user.delete({
      where: { id },
    });
    return true;
  }

  async getUser(username: string): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: { username },
    });
  }
}
