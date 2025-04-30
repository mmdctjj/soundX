import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { UserAudiobookHistoryService } from '../services/user-audiobook-history';
import { IErrorResponse, ISuccessResponse } from 'src/common/const';
import { UserAudiobookHistory } from '@prisma/client';

@Controller('user-audiobook-histories')
export class UserAudiobookHistoryController {
  constructor(
    private readonly userAudiobookHistoryService: UserAudiobookHistoryService,
  ) {}

  @Post()
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
}
