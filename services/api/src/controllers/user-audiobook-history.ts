import { Body, Controller, Delete, Get, Logger, Param, Post } from '@nestjs/common';
import { UserAudiobookHistory } from '@soundx/db';
import {
  IErrorResponse,
  ILoadMoreData,
  ISuccessResponse,
  ITableData,
} from 'src/common/const';
import { LogMethod } from '../common/log-method.decorator';
import { UserAudiobookHistoryService } from '../services/user-audiobook-history';

@Controller('user-audiobook-histories')
export class UserAudiobookHistoryController {
  private readonly logger = new Logger(UserAudiobookHistoryController.name);
  constructor(
    private readonly userAudiobookHistoryService: UserAudiobookHistoryService,
  ) { }

  @Post()
  @LogMethod()
  async create(
    @Body() createUserAudiobookHistoryDto: UserAudiobookHistory,
  ): Promise<ISuccessResponse<any> | IErrorResponse> {
    try {
      const data = await this.userAudiobookHistoryService.create(
        createUserAudiobookHistoryDto,
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
  @LogMethod()
  async findAll(): Promise<ISuccessResponse<any> | IErrorResponse> {
    try {
      const data = await this.userAudiobookHistoryService.findAll();
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
  @LogMethod()
  async findOne(
    @Param('id') id: string,
  ): Promise<ISuccessResponse<any> | IErrorResponse> {
    try {
      const data = await this.userAudiobookHistoryService.findOne(+id);
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
  @LogMethod()
  async remove(
    @Param('id') id: string,
  ): Promise<ISuccessResponse<any> | IErrorResponse> {
    try {
      const data = await this.userAudiobookHistoryService.remove(+id);
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
  @LogMethod()
  async getUserAudiobookHistoryTableList(
    @Param('pageSize') pageSize: number,
    @Param('current') current: number,
  ): Promise<
    ISuccessResponse<ITableData<UserAudiobookHistory[]>> | IErrorResponse
  > {
    try {
      const list =
        await this.userAudiobookHistoryService.getUserAudiobookHistoryTableList(
          pageSize,
          current,
        );
      const total =
        await this.userAudiobookHistoryService.userAudiobookHistoryCount();
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
  @LogMethod()
  async loadMoreUserAudiobookHistory(
    @Param('pageSize') pageSize: number,
    @Param('loadCount') loadCount: number,
  ): Promise<
    ISuccessResponse<ILoadMoreData<UserAudiobookHistory[]>> | IErrorResponse
  > {
    try {
      const list =
        await this.userAudiobookHistoryService.loadMoreUserAudiobookHistory(
          pageSize,
          loadCount,
        );
      const total =
        await this.userAudiobookHistoryService.userAudiobookHistoryCount();
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
