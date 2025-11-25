import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Album } from '@soundx/db';
import {
  IErrorResponse,
  ILoadMoreData,
  ISuccessResponse,
  ITableData,
} from 'src/common/const';
import { AlbumService } from '../services/album';

@Controller('/album')
export class AlbumController {
  constructor(private readonly albumService: AlbumService) {}

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
}
