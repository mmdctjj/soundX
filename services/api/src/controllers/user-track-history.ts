import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { UserTrackHistoryService } from '../services/user-track-history';
import {
  IErrorResponse,
  ILoadMoreData,
  ISuccessResponse,
  ITableData,
} from 'src/common/const';
import { UserTrackHistory } from '@soundx/db';

@Controller('user-track-histories')
export class UserTrackHistoryController {
  constructor(
    private readonly userTrackHistoryService: UserTrackHistoryService,
  ) {}

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

  @Get('/table-list')
  async getUserTrackHistoryTableList(
    @Param('pageSize') pageSize: number,
    @Param('current') current: number,
  ): Promise<
    ISuccessResponse<ITableData<UserTrackHistory[]>> | IErrorResponse
  > {
    try {
      const list =
        await this.userTrackHistoryService.getUserTrackHistoryTableList(
          pageSize,
          current,
        );
      const total = await this.userTrackHistoryService.userTrackHistoryCount();
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
    @Param('pageSize') pageSize: number,
    @Param('loadCount') loadCount: number,
  ): Promise<
    ISuccessResponse<ILoadMoreData<UserTrackHistory[]>> | IErrorResponse
  > {
    try {
      const list = await this.userTrackHistoryService.loadMoreUserTrackHistory(
        pageSize,
        loadCount,
      );
      const total = await this.userTrackHistoryService.userTrackHistoryCount();
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
