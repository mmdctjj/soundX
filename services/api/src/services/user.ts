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
    const count = await this.prisma.user.count();
    if (count === 0) {
      user.is_admin = true;
    }
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

  async getUserById(id: number): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id },
    });
  }

  async saveDevice(userId: number, deviceName: string) {
    // 查找当前用户的该设备是否存在
    const device = await this.prisma.device.findFirst({
      where: {
        userId,
        name: deviceName,
      },
    });

    if (device) {
      // 如果存在，更新在线状态
      return await this.prisma.device.update({
        where: { id: device.id },
        data: { isOnline: true },
      });
    } else {
      // 如果不存在，创建新设备
      return await this.prisma.device.create({
        data: {
          userId,
          name: deviceName,
          isOnline: true,
        },
      });
    }
  }
}
