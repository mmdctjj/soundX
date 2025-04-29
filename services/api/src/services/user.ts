import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

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
