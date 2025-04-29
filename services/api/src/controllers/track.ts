import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { TrackService } from '../services/track';
import { Track } from '@prisma/client';
import { IErrorResponse, ISuccessResponse } from 'src/common/const';
import { Public } from 'src/common/public.decorator';

@Controller()
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @Get('/track/list')
  async getTrackList(): Promise<ISuccessResponse<Track[]> | IErrorResponse> {
    try {
      const trackList = await this.trackService.getTrackList();
      return {
        code: 200,
        message: 'success',
        data: trackList,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Public()
  @Post('/track')
  async createTrack(
    @Body() track: Omit<Track, 'id' | 'createdAt'>,
  ): Promise<ISuccessResponse<Track> | IErrorResponse> {
    try {
      const trackInfo = await this.trackService.createTrack(track);
      return {
        code: 200,
        message: 'success',
        data: trackInfo,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Put('/track/:id')
  async updateTrack(
    @Param('id') id: string,
    @Body() track: Partial<Track>,
  ): Promise<ISuccessResponse<Track> | IErrorResponse> {
    try {
      const trackInfo = await this.trackService.updateTrack(
        parseInt(id),
        track,
      );
      return {
        code: 200,
        message: 'success',
        data: trackInfo,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Delete('/track/:id')
  async deleteTrack(
    @Param('id') id: string,
  ): Promise<ISuccessResponse<boolean> | IErrorResponse> {
    try {
      const isSuccess = await this.trackService.deleteTrack(parseInt(id));
      return {
        code: 200,
        message: 'success',
        data: isSuccess,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }
}
