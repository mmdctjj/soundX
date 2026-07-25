import { BadRequestException, Body, Controller, ForbiddenException, Get, Logger, Post, Req } from '@nestjs/common';
import { IErrorResponse, ISuccessResponse } from '../common/const';
import { LogMethod } from '../common/log-method.decorator';
import {
  FileSources,
  FileSourcesService,
  FileSourcesView,
  ResolvedFileSources,
} from '../services/file-sources.service';
import { ImportService } from '../services/import';
import { UserService } from '../services/user';
import * as path from 'path';

@Controller('admin/file-sources')
export class FileSourcesController {
  private readonly logger = new Logger(FileSourcesController.name);

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
    try {
      await this.checkAdmin(req.user.userId);
      const view = await this.fileSources.getSources();
      return { code: 200, message: 'success', data: view };
    } catch (error) {
      // HttpException (e.g. ForbiddenException) bubbles up to the global filter;
      // anything else gets the same 500 envelope as POST so callers can rely on it.
      if (error && typeof error === 'object' && 'getStatus' in (error as any)) throw error;
      const message = error instanceof Error ? error.message : String(error);
      return { code: 500, message };
    }
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
    // Guard against an empty payload wiping every configured directory: saving
    // an all-empty FileSources would make applyFileSourcesChanges treat every
    // previous dir as "removed" and soft-trash all tracks/mvs.
    const hasAnyPath = (['musicDirs', 'audiobookDirs', 'mvDirs', 'txtDirs'] as const).some(
      (key) =>
        Array.isArray(body[key]) &&
        body[key].some((v) => typeof v === 'string' && v.trim() !== ''),
    );
    if (!hasAnyPath) {
      throw new BadRequestException('至少需要配置一个目录');
    }
    try {
      // Snapshot + save. Resolve both sides so we can (a) skip the watcher rebuild
      // when only txtDirs (or nothing) changed, and (b) pass *normalized* arrays
      // to applyFileSourcesChanges so 'A;B' saved as one root doesn't trash both
      // A and B.
      const previousResolved = await this.fileSources.getResolved();
      await this.fileSources.save(body);
      const currentResolved = await this.fileSources.getResolved();

      if (this.watchedRootsChanged(previousResolved, currentResolved)) {
        const cacheDir = path.resolve(process.env.CACHE_DIR || './music/cover');
        this.importService.setupWatcher(
          currentResolved.musicDirs,
          currentResolved.audiobookDirs,
          currentResolved.mvDirs,
          cacheDir,
        );
      }

      // Soft-trash tracks/mvs that lived under removed paths (best-effort, logged inside).
      await this.importService.applyFileSourcesChanges(previousResolved, currentResolved);

      const view = await this.fileSources.getSources();
      return { code: 200, message: 'success', data: view };
    } catch (error) {
      // The new config is already persisted at this point. If the side-effect
      // pass threw (most commonly: a one-off DB error in the soft-trash), the
      // settings are saved but the watcher / trash state is stale. We can't
      // safely roll back the settings here without re-trashing anything the
      // caller already intended to keep, so we surface a clear error that
      // tells the operator to re-save once the underlying issue is fixed.
      // HttpException is rethrown so the global filter still owns its shape.
      if (error && typeof error === 'object' && 'getStatus' in (error as any)) throw error;
      const detail = error instanceof Error ? error.message : String(error);
      this.logPartialStateWarning(detail);
      return {
        code: 500,
        message: `保存成功，但软删历史文件时失败 (${detail})。请在修复后再次保存以重试侧效（监听器重建、被移除路径下的 Track / MV 软删）。`,
      };
    }
  }

  @Post('sync')
  @LogMethod()
  async sync(@Req() req: any): Promise<ISuccessResponse<{ taskId: string }> | IErrorResponse> {
    try {
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
    } catch (error) {
      if (error && typeof error === 'object' && 'getStatus' in (error as any)) throw error;
      const message = error instanceof Error ? error.message : String(error);
      return { code: 500, message };
    }
  }

  /**
   * The watcher only depends on music/audiobook/mv roots; txtDirs is a TTS-only
   * setting. Skip the rebuild entirely when none of the three watched sets
   * changed — it closes and re-opens the underlying chokidar instance, which
   * can drop in-flight events and permanently filter out paths that briefly
   * disappeared mid-rebuild.
   */
  private watchedRootsChanged(a: ResolvedFileSources, b: ResolvedFileSources): boolean {
    return (
      !this.sameSet(a.musicDirs, b.musicDirs) ||
      !this.sameSet(a.audiobookDirs, b.audiobookDirs) ||
      !this.sameSet(a.mvDirs, b.mvDirs)
    );
  }

  private sameSet(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const aSorted = [...a].sort();
    const bSorted = [...b].sort();
    for (let i = 0; i < aSorted.length; i++) if (aSorted[i] !== bSorted[i]) return false;
    return true;
  }

  private logPartialStateWarning(detail: string): void {
    // Mirror to the structured (pino) logger so operators see it in the log.
    this.logger.warn(
      `Saved config but post-save side-effects failed: ${detail}`,
    );
  }
}