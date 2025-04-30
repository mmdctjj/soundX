import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { UserTrackHistoryService } from '../services/user-track-history';
import { IErrorResponse, ISuccessResponse } from 'src/common/const';
import { UserTrackHistory } from '@prisma/client';

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
}
