import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import * as path from 'path';
import { LogMethod } from '../common/log-method.decorator';
import { DEFAULT_CACHE_DIR } from '../common/media-paths';
import { resolvePathListFromBody } from '../common/path-list';
import { ImportService } from '../services/import';

@Controller('import')
export class ImportController {
  private readonly logger = new Logger(ImportController.name);
  constructor(
    private readonly importService: ImportService,
  ) { }

  @Post('task')
  @LogMethod()
  async createTask(@Body() body: any) {
    let { musicPath, audiobookPath, mvPath, cachePath, mode } = body;

    const defaultMusic = process.env.MUSIC_BASE_DIR || './music/music';
    const defaultAudiobook = process.env.AUDIO_BOOK_DIR || './music/audio';
    const defaultMv = process.env.MV_BASE_DIR || './music/mv';

    const musicPaths = musicPath === undefined
      ? resolvePathListFromBody(undefined, defaultMusic)
      : resolvePathListFromBody(musicPath, defaultMusic);
    const audiobookPaths = audiobookPath === undefined
      ? resolvePathListFromBody(undefined, defaultAudiobook)
      : resolvePathListFromBody(audiobookPath, defaultAudiobook);
    const mvPaths = mvPath === undefined
      ? resolvePathListFromBody(undefined, defaultMv)
      : resolvePathListFromBody(mvPath, defaultMv);
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
