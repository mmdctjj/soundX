import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { TrackType } from '@soundx/db';
import { Request } from 'express';
import { IErrorResponse, ILoadMoreData, ISuccessResponse } from 'src/common/const';
import { Track } from '@soundx/db';
import { PlaylistService } from '../services/playlist';

@Controller('playlists')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) { }

  @Post()
  async create(@Req() req: Request, @Body() body: any) {
    try {
      const userId = (req.user as any)?.userId;
      const data = await this.playlistService.create({ ...body, userId });
      return { code: 200, message: 'success', data };
    } catch (error) {
      return { code: 500, message: error };
    }
  }

  @Get()
  async findAll(@Req() req: Request, @Query('type') type?: TrackType) {
    try {
      const userId = (req.user as any)?.userId;
      const data = await this.playlistService.findAll(Number(userId), type);
      return { code: 200, message: 'success', data };
    } catch (error) {
      return { code: 500, message: error };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const data = await this.playlistService.findOne(+id);
      return { code: 200, message: 'success', data };
    } catch (error) {
      return { code: 500, message: error };
    }
  }

  /**
   * 分页加载 playlist 内的 tracks。
   * - skip >= 0; pageSize 1-500；返回 ILoadMoreData<Track[]> 形态（兼容前端 useLoadMore）
   * - 与 :id 冲突：必须放在 :id 之前（Nest 路由按声明顺序匹配）
   */
  @Get(':id/tracks')
  async findTracksPaged(
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('pageSize') pageSize?: string,
    @Query('loadCount') loadCount?: string,
  ): Promise<ISuccessResponse<ILoadMoreData<Track[]>> | IErrorResponse> {
    try {
      const playlistId = +id;
      if (!Number.isFinite(playlistId)) {
        return { code: 500, message: 'invalid playlist id' };
      }
      const ps = Math.min(Math.max(1, Number(pageSize) || 100), 500);
      // loadCount 是 useLoadMore 的另一形态（page index），优先用 skip
      const sk = Math.max(0, Number(skip ?? (Number(loadCount) || 0) * ps));
      const result = await this.playlistService.findTracksPaged(playlistId, sk, ps);
      return {
        code: 200,
        message: 'success',
        data: {
          pageSize: ps,
          loadCount: Math.floor(sk / ps),
          list: result.list as unknown as Track[],
          total: result.total,
          hasMore: result.hasMore,
        },
      };
    } catch (error) {
      return { code: 500, message: error };
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    try {
      const data = await this.playlistService.update(+id, body);
      return { code: 200, message: 'success', data };
    } catch (error) {
      return { code: 500, message: error };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.playlistService.remove(+id);
      return { code: 200, message: 'success' };
    } catch (error) {
      return { code: 500, message: error };
    }
  }

  @Post(':id/tracks')
  async addTrack(@Param('id') id: string, @Body('trackId') trackId: number) {
    try {
      const data = await this.playlistService.addTrack(+id, trackId);
      return { code: 200, message: 'success', data };
    } catch (error) {
      return { code: 500, message: error };
    }
  }

  @Post(':id/tracks/batch')
  async addTracks(@Param('id') id: string, @Body('trackIds') trackIds: number[]) {
    try {
      const data = await this.playlistService.addTracks(+id, trackIds);
      return { code: 200, message: 'success', data };
    } catch (error) {
      return { code: 500, message: error };
    }
  }

  @Delete(':id/tracks/:trackId')
  async removeTrack(@Param('id') id: string, @Param('trackId') trackId: string) {
    try {
      const data = await this.playlistService.removeTrack(+id, +trackId);
      return { code: 200, message: 'success', data };
    } catch (error) {
      return { code: 500, message: error };
    }
  }
}
