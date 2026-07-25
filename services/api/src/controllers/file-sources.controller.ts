import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Req } from '@nestjs/common';
import { IErrorResponse, ISuccessResponse } from '../common/const';
import { LogMethod } from '../common/log-method.decorator';
import { FileSourcesService, FileSources, FileSourcesView } from '../services/file-sources.service';
import { ImportService } from '../services/import';
import { UserService } from '../services/user';
import * as path from 'path';

@Controller('admin/file-sources')
export class FileSourcesController {
  constructor(
    private readonly userService: UserService,
    private readonly fileSources: FileSourcesService,
    private readonly importService: ImportService,
  ) {}

  private async checkAdmin(userId: number) {
    const user = await this.userService.getUserById(userId);
    if (!user || !user.is_admin) throw new ForbiddenException('需要管理员权限');
  }

  @Get()
  @LogMethod()
  async list(@Req() req: any): Promise<ISuccessResponse<FileSourcesView> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    const view = await this.fileSources.getSources();
    return { code: 200, message: 'success', data: view };
  }

  @Post()
  @LogMethod()
  async save(
    @Req() req: any,
    @Body() body: FileSources,
  ): Promise<ISuccessResponse<FileSourcesView> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('请求格式错误');
    }
    try {
      const previous = await this.fileSources.snapshot();
      await this.fileSources.save(body);

      const resolved = await this.fileSources.getResolved();
      const cacheDir = path.resolve(process.env.CACHE_DIR || './music/cover');
      // Rebuild watcher with the new path set (same semantics as bootstrap).
      this.importService.setupWatcher(resolved.musicDirs, resolved.audiobookDirs, resolved.mvDirs, cacheDir);

      // Soft-trash tracks that lived under removed paths (best-effort, logged inside).
      await this.importService.applyFileSourcesChanges(
        { musicDirs: previous.musicDirs, audiobookDirs: previous.audiobookDirs, mvDirs: previous.mvDirs },
        { musicDirs: body.musicDirs, audiobookDirs: body.audiobookDirs, mvDirs: body.mvDirs },
      );

      const view = await this.fileSources.getSources();
      return { code: 200, message: 'success', data: view };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { code: 500, message };
    }
  }

  @Post('sync')
  @LogMethod()
  async sync(@Req() req: any): Promise<ISuccessResponse<{ taskId: string }> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    const resolved = await this.fileSources.getResolved();
    const cacheDir = path.resolve(process.env.CACHE_DIR || './music/cover');
    const taskId = this.importService.createTask(
      resolved.musicDirs,
      resolved.audiobookDirs,
      resolved.mvDirs,
      cacheDir,
      'incremental',
    );
    return { code: 200, message: 'success', data: { taskId } };
  }
}
