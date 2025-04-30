import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { UserService } from '../services/user';
import { User } from '@prisma/client';
import { IErrorResponse, ISuccessResponse } from 'src/common/const';
import { Public } from 'src/common/public.decorator';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/user/list')
  async getUserList(): Promise<ISuccessResponse<User[]> | IErrorResponse> {
    try {
      const useList = await this.userService.getUserList();

      return {
        code: 200,
        message: 'success',
        data: useList,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Public()
  @Post('/user')
  async createUser(
    @Body() user: Omit<User, 'id'>,
  ): Promise<ISuccessResponse<User> | IErrorResponse> {
    try {
      const userInfo = await this.userService.createUser(user);
      return {
        code: 200,
        message: 'success',
        data: userInfo,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Put('/user/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() user: Partial<User>,
  ): Promise<ISuccessResponse<User> | IErrorResponse> {
    try {
      const userInfo = await this.userService.updateUser(parseInt(id), user);
      return {
        code: 200,
        message: 'success',
        data: userInfo,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Delete('/user/:id')
  async deleteUser(
    @Param('id') id: string,
  ): Promise<ISuccessResponse<boolean> | IErrorResponse> {
    try {
      const isSuccess = await this.userService.deleteUser(parseInt(id));
      return {
        code: 200,
        message: 'success',
        data: isSuccess,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }
}
