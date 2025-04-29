import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { AlbumService } from '../services/album';
import { Album } from '@prisma/client';
import { IErrorResponse, ISuccessResponse } from 'src/common/const';
import { Public } from 'src/common/public.decorator';

@Controller()
export class AlbumController {
  constructor(private readonly albumService: AlbumService) {}

  @Get('/album/list')
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

  @Public()
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

  @Put('/album/:id')
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

  @Delete('/album/:id')
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
}
