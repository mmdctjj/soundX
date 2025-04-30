import { UserTrackLike } from '@prisma/client';
import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { UserTrackLikeService } from '../services/user-track-like';
import { IErrorResponse, ISuccessResponse } from 'src/common/const';

@Controller('user-track-likes')
export class UserTrackLikeController {
  constructor(private readonly userTrackLikeService: UserTrackLikeService) {}

  @Post('/create')
  async create(
    @Body() bodyData: UserTrackLike,
  ): Promise<ISuccessResponse<UserTrackLike> | IErrorResponse> {
    try {
      const data = await this.userTrackLikeService.create(bodyData);
      return {
        code: 200,
        message: 'success',
        data,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Get('/list')
  async findAll(): Promise<ISuccessResponse<UserTrackLike[]> | IErrorResponse> {
    try {
      const data = await this.userTrackLikeService.findAll();
      return {
        code: 200,
        message: 'success',
        data,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  ): Promise<ISuccessResponse<UserTrackLike | null> | IErrorResponse> {
    try {
      const data = await this.userTrackLikeService.findOne(+id);
      return {
        code: 200,
        message: 'success',
        data,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
  ): Promise<ISuccessResponse<UserTrackLike> | IErrorResponse> {
    try {
      const data = await this.userTrackLikeService.remove(+id);
      return {
        code: 200,
        message: 'success',
        data,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }
}
