import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ArtistService } from '../services/artist';
import { Artist } from '@prisma/client';
import { IErrorResponse, ISuccessResponse } from 'src/common/const';
import { Public } from 'src/common/public.decorator';

@Controller()
export class ArtistController {
  constructor(private readonly artistService: ArtistService) {}

  @Get('/artist/list')
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

  @Public()
  @Post('/artist')
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

  @Put('/artist/:id')
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

  @Delete('/artist/:id')
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
}
