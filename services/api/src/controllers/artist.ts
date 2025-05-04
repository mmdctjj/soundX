import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Artist } from '@prisma/client';
import {
  IErrorResponse,
  ILoadMoreData,
  ISuccessResponse,
  ITableData,
} from 'src/common/const';
import { Public } from 'src/common/public.decorator';
import { ArtistService } from '../services/artist';

@Controller('/artist')
export class ArtistController {
  constructor(private readonly artistService: ArtistService) {}

  @Get('/list')
  async getArtistList(): Promise<ISuccessResponse<Artist[]> | IErrorResponse> {
    try {
      const artistList = await this.artistService.getArtistList();
      return {
        code: 200,
        message: 'success',
        data: artistList,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Get('/table-list')
  async getArtistTableList(
    @Param('pageSize') pageSize: number,
    @Param('current') current: number,
  ): Promise<ISuccessResponse<ITableData<Artist[]>> | IErrorResponse> {
    try {
      const artistList = await this.artistService.getArtistTableList(
        pageSize,
        current,
      );
      const total = await this.artistService.artistCount();
      return {
        code: 200,
        message: 'success',
        data: {
          pageSize,
          current,
          list: artistList,
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
  async loadMoreArtist(
    @Param('pageSize') pageSize: number,
    @Param('loadCount') loadCount: number,
  ): Promise<ISuccessResponse<ILoadMoreData<Artist[]>> | IErrorResponse> {
    try {
      const artistList = await this.artistService.loadMoreArtist(
        pageSize,
        loadCount,
      );
      const total = await this.artistService.artistCount();
      return {
        code: 200,
        message: 'success',
        data: {
          pageSize,
          loadCount,
          list: artistList,
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
  @Post()
  async createArtist(
    @Body() artist: Omit<Artist, 'id'>,
  ): Promise<ISuccessResponse<Artist> | IErrorResponse> {
    try {
      const artistInfo = await this.artistService.createArtist(artist);
      return {
        code: 200,
        message: 'success',
        data: artistInfo,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Put('/:id')
  async updateArtist(
    @Param('id') id: string,
    @Body() artist: Partial<Artist>,
  ): Promise<ISuccessResponse<Artist> | IErrorResponse> {
    try {
      const artistInfo = await this.artistService.updateArtist(
        parseInt(id),
        artist,
      );
      return {
        code: 200,
        message: 'success',
        data: artistInfo,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Delete('/:id')
  async deleteArtist(
    @Param('id') id: string,
  ): Promise<ISuccessResponse<boolean> | IErrorResponse> {
    try {
      const isSuccess = await this.artistService.deleteArtist(parseInt(id));
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

  @Post('/batch-create')
  async createArtists(
    @Body() artists: Omit<Artist, 'id'>[],
  ): Promise<ISuccessResponse<boolean> | IErrorResponse> {
    try {
      const artistInfo = await this.artistService.createArtists(artists);
      if (artistInfo) {
        return {
          code: 200,
          message: 'success',
          data: artistInfo,
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

  @Delete('/batch-delete')
  async deleteArtists(
    @Body() ids: number[],
  ): Promise<ISuccessResponse<boolean> | IErrorResponse> {
    try {
      const result = await this.artistService.deleteArtists(ids);
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
