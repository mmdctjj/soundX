import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, User } from '@soundx/db';
import { LogMethod } from '../common/log-method.decorator';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }
  getHello(): string {
    return 'Hello World!';
  }
  @LogMethod()
  async getUserList(): Promise<User[]> {
    return await this.prisma.user.findMany();
  }

  @LogMethod()
  async getUserTableList(page: number, pageSize: number) {
    return await this.prisma.user.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  @LogMethod()
  async loadMoreUser(lastId: number, pageSize: number) {
    return await this.prisma.user.findMany({
      where: { id: { gt: lastId } },
      take: pageSize,
      orderBy: { id: 'asc' },
    });
  }

  @LogMethod()
  async userCount(): Promise<number> {
    return await this.prisma.user.count();
  }
  @LogMethod()
  async createUser(user: Omit<User, 'id'>): Promise<User> {
    return await this.prisma.user.create({
      data: user,
    });
  }

  @LogMethod()
  async updateUser(id: number, user: Partial<User>): Promise<User> {
    return await this.prisma.user.update({
      where: { id },
      data: user,
    });
  }

  @LogMethod()
  async deleteUser(id: number): Promise<boolean> {
    await this.prisma.user.delete({
      where: { id },
    });
    return true;
  }

  @LogMethod()
  async getUser(username: string): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: { username },
    });
  }
}
