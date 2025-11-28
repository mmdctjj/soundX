import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Album } from '@soundx/db';
import { Request } from 'express';
import {
  IErrorResponse,
  ILoadMoreData,
  ISuccessResponse,
  ITableData,
} from 'src/common/const';
import { AlbumService } from '../services/album';
import { TrackService } from '../services/track';

@Controller('/album')
export class AlbumController {
  constructor(
    private readonly albumService: AlbumService,
    private readonly trackService: TrackService,
  ) { }

  @Get('/list')
  async getAlbumList(): Promise<ISuccessResponse<Album[]> | IErrorResponse> {
    try {
      const albumList = await this.albumService.getAlbumList();
      return {
        code: 200,
        message: 'success',
        data: albumList,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }




  @Get('/artist/:artist')
  async getAlbumsByArtist(
    @Param('artist') artist: string,
  ): Promise<ISuccessResponse<Album[]> | IErrorResponse> {
    try {
      const albumList = await this.albumService.getAlbumsByArtist(artist);
      return {
        code: 200,
        message: 'success',
        data: albumList,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Get('/table-list')
  async getAlbumTableList(
    @Param('pageSize') pageSize: number,
    @Param('current') current: number,
  ): Promise<ISuccessResponse<ITableData<Album[]>> | IErrorResponse> {
    try {
      const albumList = await this.albumService.getAlbumTableList(
        pageSize,
        current,
      );
      const total = await this.albumService.albumCount();
      return {
        code: 200,
        message: 'success',
        data: {
          pageSize,
          current,
          list: albumList,
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
  async loadMoreAlbum(
    @Param('pageSize') pageSize: number,
    @Param('loadCount') loadCount: number,
  ): Promise<ISuccessResponse<ILoadMoreData<Album[]>> | IErrorResponse> {
    try {
      const albumList = await this.albumService.loadMoreAlbum(
        pageSize,
        loadCount,
      );
      const total = await this.albumService.albumCount();
      return {
        code: 200,
        message: 'success',
        data: {
          pageSize,
          loadCount,
          list: albumList,
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

  @Post('/album')
  async createAlbum(
    @Body() album: Omit<Album, 'id'>,
  ): Promise<ISuccessResponse<Album> | IErrorResponse> {
    try {
      const albumInfo = await this.albumService.createAlbum(album);
      return {
        code: 200,
        message: 'success',
        data: albumInfo,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Put('/:id')
  async updateAlbum(
    @Param('id') id: string,
    @Body() album: Partial<Album>,
  ): Promise<ISuccessResponse<Album> | IErrorResponse> {
    try {
      const albumInfo = await this.albumService.updateAlbum(
        parseInt(id),
        album,
      );
      return {
        code: 200,
        message: 'success',
        data: albumInfo,
      };
    } catch (error) {
      return {
        code: 500,
        message: error,
      };
    }
  }

  @Delete('/:id')
  async deleteAlbum(
    @Param('id') id: string,
  ): Promise<ISuccessResponse<boolean> | IErrorResponse> {
    try {
      const isSuccess = await this.albumService.deleteAlbum(parseInt(id));
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
  async createAlbums(
    @Body() albums: Omit<Album, 'id'>[],
  ): Promise<ISuccessResponse<boolean> | IErrorResponse> {
    try {
      const albumInfo = await this.albumService.createAlbums(albums);
      if (albumInfo) {
        return {
          code: 200,
          message: 'success',
          data: albumInfo,
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
  async deleteAlbums(
    @Body() ids: number[],
  ): Promise<ISuccessResponse<boolean> | IErrorResponse> {
    try {
      const result = await this.albumService.deleteAlbums(ids);
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

  // 新增：最近 8 个专辑
  @Get('/latest')
  async getLatestAlbums(
    @Query('type') type?: string,
  ): Promise<ISuccessResponse<Album[]> | IErrorResponse> {
    try {
      const list = await this.albumService.getLatestAlbums(8, type);
      return { code: 200, message: 'success', data: list };
    } catch (error) {
      return { code: 500, message: String(error) };
    }
  }

  // 新增：随机推荐 8 条未听过的专辑
  @Get('/recommend')
  async getRandomUnlistenedAlbums(
    @Req() req: Request,
    @Query('type') type?: string,
  ): Promise<ISuccessResponse<Album[]> | IErrorResponse> {
    try {
      const userId = (req.user as any)?.userId;
      if (!userId) {
        return { code: 500, message: '未认证用户' };
      }
      const list = await this.albumService.getRandomUnlistenedAlbums(
        Number(userId),
        8,
        type,
      );
      return { code: 200, message: 'success', data: list };
    } catch (error) {
      return { code: 500, message: String(error) };
    }
  }
  @Get('/:id')
  async getAlbumById(
    @Param('id') id: string,
  ): Promise<ISuccessResponse<Album> | IErrorResponse> {
    try {
      if (isNaN(Number(id))) {
        return { code: 500, message: 'Invalid ID' };
      }
      const album = await this.albumService.getAlbumById(parseInt(id));
      if (!album) {
        return { code: 500, message: 'Album not found' };
      }
      return {
        code: 200,
        message: 'success',
        data: album,
      };
    } catch (error) {
      return {
        code: 500,
        message: String(error),
      };
    }
  }

  @Get('/:id/tracks')
  async getAlbumTracks(
    @Param('id') id: string,
    @Query('pageSize') pageSize: number,
    @Query('skip') skip: number,
    @Query('sort') sort: 'asc' | 'desc',
    @Query('keyword') keyword: string,
  ): Promise<ISuccessResponse<any> | IErrorResponse> {
    try {
      if (isNaN(Number(id))) {
        return { code: 500, message: 'Invalid ID' };
      }
      const album = await this.albumService.getAlbumById(parseInt(id));
      if (!album) {
        return { code: 500, message: 'Album not found' };
      }
      const tracks = await this.trackService.getTracksByAlbum(
        album.name,
        album.artist,
        Number(pageSize) || 20,
        Number(skip) || 0,
        sort,
        keyword,
      );
      const total = await this.trackService.getTrackCountByAlbum(
        album.name,
        album.artist,
        keyword,
      );
      return {
        code: 200,
        message: 'success',
        data: {
          list: tracks,
          total,
        },
      };
    } catch (error) {
      return {
        code: 500,
        message: String(error),
      };
    }
  }
}
