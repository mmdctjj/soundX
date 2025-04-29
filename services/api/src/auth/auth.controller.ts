import { Controller, Request, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/public.decorator';
import { IErrorResponse, ISuccessResponse } from 'src/common/const';
import { User } from '@prisma/client';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/auth/login')
  async login(
    @Body() user: User,
  ): Promise<ISuccessResponse<User & { token: string }> | IErrorResponse> {
    const userInfo = await this.authService.validateUser(
      user.username,
      user.password,
    );
    if (userInfo) {
      // 生成token
      const token = this.authService.login(userInfo);
      return {
        code: 200,
        message: 'success',
        data: { ...userInfo, token },
      };
    } else {
      return {
        code: 500,
        message: '用户名或密码错误',
      };
    }
  }
}
