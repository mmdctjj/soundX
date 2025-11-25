import { UserTrackLike } from '@soundx/db';
import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { UserTrackLikeService } from '../services/user-track-like';
import {
  IErrorResponse,
  ISuccessResponse,
  ITableData,
  ILoadMoreData,
} from 'src/common/const';

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

  @Get('/table-list')
  async getUserTrackLikeTableList(
    @Param('page') page: string = '1',
    @Param('pageSize') pageSize: string = '10',
  ): Promise<ISuccessResponse<ITableData<UserTrackLike[]>> | IErrorResponse> {
    try {
      const list = await this.userTrackLikeService.getUserTrackLikeTableList(
        Number(page),
        Number(pageSize),
      );
      const total = await this.userTrackLikeService.userTrackLikeCount();
      return {
        code: 200,
        message: 'success',
        data: {
          pageSize: Number(pageSize),
          current: Number(page),
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
  async loadMoreUserTrackLike(
    @Param('lastId') lastId: string,
    @Param('pageSize') pageSize: string = '10',
  ): Promise<
    ISuccessResponse<ILoadMoreData<UserTrackLike[]>> | IErrorResponse
  > {
    try {
      const list = await this.userTrackLikeService.loadMoreUserTrackLike(
        Number(lastId),
        Number(pageSize),
      );
      const total = await this.userTrackLikeService.userTrackLikeCount();
      return {
        code: 200,
        message: 'success',
        data: {
          pageSize: Number(pageSize),
          loadCount: Number(lastId),
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

  @Get('/count')
  async userTrackLikeCount(): Promise<
    ISuccessResponse<number> | IErrorResponse
  > {
    try {
      const count = await this.userTrackLikeService.userTrackLikeCount();
      return {
        code: 200,
        message: 'success',
        data: count,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }
}
