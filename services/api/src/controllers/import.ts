import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import * as path from 'path';
import { LogMethod } from '../common/log-method.decorator';
import { ImportService } from '../services/import';

@Controller('import')
export class ImportController {
  private readonly logger = new Logger(ImportController.name);
  constructor(private readonly importService: ImportService) { }

  @Post('task')
  @LogMethod()
  async createTask(@Body() body: any) {
    let { musicPath, audiobookPath, cachePath, mode } = body;

    // Use server-side defaults from environment variables checks
    if (!musicPath) musicPath = path.resolve(process.env.MUSIC_BASE_DIR || './');
    if (!audiobookPath) audiobookPath = path.resolve(process.env.AUDIO_BOOK_DIR || './');
    if (!cachePath) cachePath = path.resolve(process.env.CACHE_DIR || './');

    const id = await this.importService.createTask(musicPath, audiobookPath, cachePath, mode || 'incremental');
    return { code: 200, message: 'success', data: { id } };
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
}
