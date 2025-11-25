import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { UserAlbumLikeService } from '../services/user-album-like';
import {
  IErrorResponse,
  ILoadMoreData,
  ISuccessResponse,
  ITableData,
} from 'src/common/const';
import { UserAlbumLike } from '@soundx/db';
@Controller('user-album-likes')
export class UserAlbumLikeController {
  constructor(private readonly userAlbumLikeService: UserAlbumLikeService) {}

  @Post()
  async create(
    @Body() createUserAlbumLikeDto: UserAlbumLike,
  ): Promise<ISuccessResponse<any> | IErrorResponse> {
    try {
      const data = await this.userAlbumLikeService.create(
        createUserAlbumLikeDto,
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
      const data = await this.userAlbumLikeService.findAll();
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
      const data = await this.userAlbumLikeService.findOne(+id);
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
      const data = await this.userAlbumLikeService.remove(+id);
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
  async getUserAlbumLikeTableList(
    @Param('pageSize') pageSize: number,
    @Param('current') current: number,
  ): Promise<ISuccessResponse<ITableData<UserAlbumLike[]>> | IErrorResponse> {
    try {
      const list = await this.userAlbumLikeService.getUserAlbumLikeTableList(
        pageSize,
        current,
      );
      const total = await this.userAlbumLikeService.userAlbumLikeCount();
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
  async loadMoreUserAlbumLike(
    @Param('pageSize') pageSize: number,
    @Param('loadCount') loadCount: number,
  ): Promise<
    ISuccessResponse<ILoadMoreData<UserAlbumLike[]>> | IErrorResponse
  > {
    try {
      const list = await this.userAlbumLikeService.loadMoreUserAlbumLike(
        pageSize,
        loadCount,
      );
      const total = await this.userAlbumLikeService.userAlbumLikeCount();
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
