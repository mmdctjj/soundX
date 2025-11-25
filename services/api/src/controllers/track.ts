import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Track } from '@soundx/db';
import {
  IErrorResponse,
  ILoadMoreData,
  ISuccessResponse,
  ITableData,
} from 'src/common/const';
import { Public } from 'src/common/public.decorator';
import { TrackService } from '../services/track';

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

  @Get('/table-list')
  async getTrackTableList(
    @Param('pageSize') pageSize: number,
    @Param('current') current: number,
  ): Promise<ISuccessResponse<ITableData<Track[]>> | IErrorResponse> {
    try {
      const trackList = await this.trackService.getTrackTableList(
        pageSize,
        current,
      );
      const total = await this.trackService.trackCount();
      return {
        code: 200,
        message: 'success',
        data: {
          pageSize,
          current,
          list: trackList,
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
  async loadMoreTrack(
    @Param('pageSize') pageSize: number,
    @Param('loadCount') loadCount: number,
  ): Promise<ISuccessResponse<ILoadMoreData<Track[]>> | IErrorResponse> {
    try {
      const trackList = await this.trackService.loadMoreTrack(
        pageSize,
        loadCount,
      );
      const total = await this.trackService.trackCount();
      return {
        code: 200,
        message: 'success',
        data: {
          pageSize,
          loadCount,
          list: trackList,
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

  @Public()
  @Post('/track')
  async createTrack(
    @Body() track: Omit<Track, 'id'>,
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

  @Post('/track/batch-create')
  async createTracks(
    @Body() tracks: Omit<Track, 'id'>[],
  ): Promise<ISuccessResponse<boolean> | IErrorResponse> {
    try {
      const trackInfo = await this.trackService.createTracks(tracks);
      if (trackInfo) {
        return {
          code: 200,
          message: 'success',
          data: trackInfo,
        };
      } else {
        return {
          code: 500,
          message: '批量新增失败',
        };
      }
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Delete('/track/batch-delete')
  async deleteTracks(
    @Body() ids: number[],
  ): Promise<ISuccessResponse<boolean> | IErrorResponse> {
    try {
      const result = await this.trackService.deleteTracks(ids);
      if (result) {
        return {
          code: 200,
          message: 'success',
          data: result,
        };
      } else {
        return {
          code: 500,
          message: '批量删除失败',
        };
      }
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }
}
