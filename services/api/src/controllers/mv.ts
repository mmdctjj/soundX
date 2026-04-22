import {
  Controller,
  Get,
  Logger,
  Param,
  Query,
} from '@nestjs/common';
import { Mv } from '@soundx/db';
import {
  IErrorResponse,
  ISuccessResponse,
  ITableData,
} from 'src/common/const';
import { LogMethod } from '../common/log-method.decorator';
import { MvService } from '../services/mv';

@Controller()
export class MvController {
  private readonly logger = new Logger(MvController.name);
  constructor(private readonly mvService: MvService) { }

  @Get('/mv/list')
  @LogMethod()
  async getMvList(
    @Query('pageSize') pageSize: string = '20',
    @Query('skip') skip: string = '0',
    @Query('keyword') keyword?: string
  ): Promise<ISuccessResponse<ITableData<Mv[]>> | IErrorResponse> {
    try {
      const parsedPageSize = parseInt(pageSize, 10);
      const parsedSkip = parseInt(skip, 10);
      
      const { data, total } = await this.mvService.getMvList(
        parsedPageSize,
        parsedSkip,
        keyword
      );

      return {
        code: 200,
        message: 'success',
        data: {
          pageSize: parsedPageSize,
          current: Math.floor(parsedSkip / parsedPageSize) + 1,
          list: data,
          total,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get MV list', error);
      return {
        code: 500,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('/mv/artist/:artist')
  @LogMethod()
  async getMvsByArtist(
    @Param('artist') artist: string,
  ): Promise<ISuccessResponse<Mv[]> | IErrorResponse> {
    try {
      const mvs = await this.mvService.getMvsByArtist(artist);
      return {
        code: 200,
        message: 'success',
        data: mvs,
      };
    } catch (error) {
      this.logger.error(`Failed to get MVs for artist ${artist}`, error);
      return {
        code: 500,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('/mv/album')
  @LogMethod()
  async getMvsByAlbum(
    @Query('album') album: string,
    @Query('artist') artist: string,
  ): Promise<ISuccessResponse<Mv[]> | IErrorResponse> {
    try {
      const mvs = await this.mvService.getMvsByAlbum(album, artist);
      return {
        code: 200,
        message: 'success',
        data: mvs,
      };
    } catch (error) {
      this.logger.error(`Failed to get MVs for album ${album}`, error);
      return {
        code: 500,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('/mv/track/:trackId')
  @LogMethod()
  async getMvByTrack(
    @Param('trackId') trackId: string,
  ): Promise<ISuccessResponse<Mv | null> | IErrorResponse> {
    try {
      const mv = await this.mvService.getMvByTrack(parseInt(trackId, 10));
      return {
        code: 200,
        message: 'success',
        data: mv,
      };
    } catch (error) {
      this.logger.error(`Failed to get MV for track ${trackId}`, error);
      return {
        code: 500,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('/mv/random')
  @LogMethod()
  async getRandomMvs(
    @Query('limit') limit: string = '8',
  ): Promise<ISuccessResponse<Mv[]> | IErrorResponse> {
    try {
      const mvs = await this.mvService.getRandomMvs(parseInt(limit, 10));
      return {
        code: 200,
        message: 'success',
        data: mvs,
      };
    } catch (error) {
      return {
        code: 500,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('/mv/:id')
  @LogMethod()
  async getMvById(
    @Param('id') id: string,
  ): Promise<ISuccessResponse<Mv | null> | IErrorResponse> {
    try {
      const mv = await this.mvService.getMvById(parseInt(id, 10));
      return {
        code: 200,
        message: 'success',
        data: mv,
      };
    } catch (error) {
      this.logger.error(`Failed to get MV ${id}`, error);
      return {
        code: 500,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
