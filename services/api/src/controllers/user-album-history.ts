import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { UserAlbumHistory } from '@soundx/db';
import {
  IErrorResponse,
  ILoadMoreData,
  ISuccessResponse,
  ITableData,
} from 'src/common/const';
import { UserAlbumHistoryService } from '../services/user-album-history';

@Controller('user-album-histories')
export class UserAlbumHistoryController {
  constructor(
    private readonly userAlbumHistoryService: UserAlbumHistoryService,
  ) { }

  @Post()
  async create(
    @Body() createUserAlbumHistoryDto: UserAlbumHistory,
  ): Promise<ISuccessResponse<any> | IErrorResponse> {
    try {
      const data = await this.userAlbumHistoryService.create(
        createUserAlbumHistoryDto,
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
      const data = await this.userAlbumHistoryService.findAll();
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
      const data = await this.userAlbumHistoryService.remove(+id);
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
  async getUserAlbumHistoryTableList(
    @Param('pageSize') pageSize: number,
    @Param('current') current: number,
  ): Promise<
    ISuccessResponse<ITableData<UserAlbumHistory[]>> | IErrorResponse
  > {
    try {
      const list =
        await this.userAlbumHistoryService.getUserAlbumHistoryTableList(
          pageSize,
          current,
        );
      const total = await this.userAlbumHistoryService.userAlbumHistoryCount();
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
  async loadMoreUserAlbumHistory(
    @Query('pageSize') pageSize: string,
    @Query('loadCount') loadCount: string,
    @Query('userId') userId: string,
  ): Promise<
    ISuccessResponse<ILoadMoreData<UserAlbumHistory[]>> | IErrorResponse
  > {
    try {
      const pageSizeNum = parseInt(pageSize, 10);
      const loadCountNum = parseInt(loadCount, 10);
      const userIdNum = parseInt(userId, 10);

      const list = await this.userAlbumHistoryService.loadMoreUserAlbumHistory(
        pageSizeNum,
        loadCountNum,
        userIdNum,
      );
      const total = await this.userAlbumHistoryService.userAlbumHistoryCount(userIdNum);

      return {
        code: 200,
        message: 'success',
        data: {
          pageSize: pageSizeNum,
          loadCount: loadCountNum,
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

  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<ISuccessResponse<any> | IErrorResponse> {
    try {
      const data = await this.userAlbumHistoryService.findOne(+id);
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


