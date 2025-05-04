import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { UserAudiobookLikeService } from '../services/user-audiobook-like';
import {
  IErrorResponse,
  ILoadMoreData,
  ISuccessResponse,
  ITableData,
} from 'src/common/const';
import { UserAudiobookLike } from '@prisma/client';

@Controller('user-audiobook-likes')
export class UserAudiobookLikeController {
  constructor(
    private readonly userAudiobookLikeService: UserAudiobookLikeService,
  ) {}

  @Post()
  async create(
    @Body() createUserAudiobookLikeDto: UserAudiobookLike,
  ): Promise<ISuccessResponse<any> | IErrorResponse> {
    try {
      const data = await this.userAudiobookLikeService.create(
        createUserAudiobookLikeDto,
      );
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

  @Get()
  async findAll(): Promise<ISuccessResponse<any> | IErrorResponse> {
    try {
      const data = await this.userAudiobookLikeService.findAll();
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
  ): Promise<ISuccessResponse<any> | IErrorResponse> {
    try {
      const data = await this.userAudiobookLikeService.findOne(+id);
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
  ): Promise<ISuccessResponse<any> | IErrorResponse> {
    try {
      const data = await this.userAudiobookLikeService.remove(+id);
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

  @Get('/table-list')
  async getUserAudiobookLikeTableList(
    @Param('pageSize') pageSize: number,
    @Param('current') current: number,
  ): Promise<
    ISuccessResponse<ITableData<UserAudiobookLike[]>> | IErrorResponse
  > {
    try {
      const list =
        await this.userAudiobookLikeService.getUserAudiobookLikeTableList(
          pageSize,
          current,
        );
      const total =
        await this.userAudiobookLikeService.userAudiobookLikeCount();
      return {
        code: 200,
        message: 'success',
        data: {
          pageSize,
          current,
          list,
          total,
        },
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Get('/load-more')
  async loadMoreUserAudiobookLike(
    @Param('pageSize') pageSize: number,
    @Param('loadCount') loadCount: number,
  ): Promise<
    ISuccessResponse<ILoadMoreData<UserAudiobookLike[]>> | IErrorResponse
  > {
    try {
      const list =
        await this.userAudiobookLikeService.loadMoreUserAudiobookLike(
          pageSize,
          loadCount,
        );
      const total =
        await this.userAudiobookLikeService.userAudiobookLikeCount();
      return {
        code: 200,
        message: 'success',
        data: {
          pageSize,
          loadCount,
          list,
          total,
        },
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }
}
