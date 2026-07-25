import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import * as path from 'path';
import { LogMethod } from '../common/log-method.decorator';
import { DEFAULT_CACHE_DIR } from '../common/media-paths';
import { resolvePathListFromBody } from '../common/path-list';
import { FileSourcesService } from '../services/file-sources.service';
import { ImportService } from '../services/import';

@Controller('import')
export class ImportController {
  private readonly logger = new Logger(ImportController.name);
  constructor(
    private readonly importService: ImportService,
    private readonly fileSources: FileSourcesService,
  ) { }

  @Post('task')
  @LogMethod()
  async createTask(@Body() body: any) {
    let { musicPath, audiobookPath, mvPath, cachePath, mode } = body;

    // Explicit request paths win; otherwise use the DB-backed file source configuration.
    const configured = await this.fileSources.getResolved();
    const musicPaths = musicPath === undefined
      ? configured.musicDirs
      : resolvePathListFromBody(musicPath, configured.musicDirs.join(';'));
    const audiobookPaths = audiobookPath === undefined
      ? configured.audiobookDirs
      : resolvePathListFromBody(audiobookPath, configured.audiobookDirs.join(';'));
    const mvPaths = mvPath === undefined
      ? configured.mvDirs
      : resolvePathListFromBody(mvPath, configured.mvDirs.join(';'));
    const resolvedCachePath = cachePath ? path.resolve(cachePath) : path.resolve(process.env.CACHE_DIR || DEFAULT_CACHE_DIR);

    console.log('Received import task with musicPaths:', musicPaths);

    const id = await this.importService.createTask(
      musicPaths,
      audiobookPaths,
      mvPaths,
      resolvedCachePath,
      mode || 'incremental'
    );
    return { code: 200, message: 'success', data: { id } };
  }

  @Get('tasks')
  @LogMethod()
  async getAllTasks() {
    const tasks = await this.importService.getAllTasks();
    return { code: 200, message: 'success', data: tasks };
  }

  @Get('task/:id')
  @LogMethod()
  async getTask(@Param('id') id: string) {
    const task = await this.importService.getTask(id);
    if (!task) {
      return { code: 404, message: 'Task not found' };
    }
    return { code: 200, message: 'success', data: task };
  }

  @Get('current-task')
  @LogMethod()
  async getRunningTask() {
    const task = await this.importService.getRunningTask();
    if (!task) {
      return { code: 404, message: 'No running task found' };
    }
    return { code: 200, message: 'success', data: task };
  }
}
