import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import {
  IErrorResponse,
  ILoadMoreData,
  ISuccessResponse,
  ITableData,
} from 'src/common/const';
import { UserAlbumHistoryService } from '../services/user-album-history';
import { UserAlbumHistory } from '@prisma/client';

@Controller('user-album-histories')
export class UserAlbumHistoryController {
  constructor(
    private readonly userAlbumHistoryService: UserAlbumHistoryService,
  ) {}

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
    @Param('pageSize') pageSize: number,
    @Param('loadCount') loadCount: number,
  ): Promise<
    ISuccessResponse<ILoadMoreData<UserAlbumHistory[]>> | IErrorResponse
  > {
    try {
      const list = await this.userAlbumHistoryService.loadMoreUserAlbumHistory(
        pageSize,
        loadCount,
      );
      const total = await this.userAlbumHistoryService.userAlbumHistoryCount();
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
