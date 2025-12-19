import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { UserTrackHistory } from '@soundx/db';
import {
    IErrorResponse,
    ILoadMoreData,
    ISuccessResponse,
    ITableData,
} from 'src/common/const';
import { UserTrackHistoryService } from '../services/user-track-history';

@Controller('user-track-histories')
export class UserTrackHistoryController {
  constructor(
    private readonly userTrackHistoryService: UserTrackHistoryService,
  ) { }

  @Post()
  async create(
    @Body() createUserTrackHistoryDto: UserTrackHistory,
  ): Promise<ISuccessResponse<any> | IErrorResponse> {
    try {
      const data = await this.userTrackHistoryService.create(
        createUserTrackHistoryDto,
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
      const data = await this.userTrackHistoryService.findAll();
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
  async getUserTrackHistoryTableList(
    @Param('pageSize') pageSize: number,
    @Param('current') current: number,
    @Query('userId') userId: number,
  ): Promise<
    ISuccessResponse<ITableData<UserTrackHistory[]>> | IErrorResponse
  > {
    try {
      const list =
        await this.userTrackHistoryService.getUserTrackHistoryTableList(
          pageSize,
          current,
        );
      const total = await this.userTrackHistoryService.userTrackHistoryCount(userId);
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
  async loadMoreUserTrackHistory(
    @Query('pageSize') pageSize: number,
    @Query('loadCount') loadCount: number,
    @Query('userId') userId: number,
    @Query('type') type?: string,
  ): Promise<
    ISuccessResponse<ILoadMoreData<UserTrackHistory[]>> | IErrorResponse
  > {
    try {
      const pageSizeNum = Number(pageSize)
      const loadCountNum = Number(loadCount)
      const userIdNum = Number(userId)
      const list = await this.userTrackHistoryService.loadMoreUserTrackHistory(
        pageSizeNum,
        loadCountNum,
        userIdNum,
        type,
      );
      const total = await this.userTrackHistoryService.userTrackHistoryCount(userIdNum);
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

  @Get('/latest')
  async getLatest(
    @Query('userId') userId: number,
  ): Promise<ISuccessResponse<UserTrackHistory> | IErrorResponse> {
    try {
      const data = await this.userTrackHistoryService.getLatest(Number(userId));
      return {
        code: 200,
        message: 'success',
        data: data as any,
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
      const data = await this.userTrackHistoryService.findOne(+id);
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
      const data = await this.userTrackHistoryService.remove(+id);
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
