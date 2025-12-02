import { Body, Controller, Post } from '@nestjs/common';
import { User } from '@soundx/db';
import { IErrorResponse, IParamsErrorResponse, ISuccessResponse } from 'src/common/const';
import { Public } from '../common/public.decorator';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) { }

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

  @Public()
  @Post('/auth/register')
  async register(
    @Body() user: { username: string; password: string },
  ): Promise<ISuccessResponse<User & { token: string }> | IErrorResponse | IParamsErrorResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.authService.findUserByUsername(user.username);
      if (existingUser) {
        return {
          code: 400,
          message: '用户名已存在',
        };
      }

      // Create new user
      const newUser = await this.authService.register(user.username, user.password);

      // Generate token
      const token = this.authService.login(newUser);

      return {
        code: 200,
        message: 'success',
        data: { ...newUser, token },
      };
    } catch (error) {
      return {
        code: 500,
        message: error.message || '注册失败',
      };
    }
  }
}
