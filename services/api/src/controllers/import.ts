import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { LogMethod } from '../common/log-method.decorator';
import { ImportService } from '../services/import';

@Controller('import')
export class ImportController {
  private readonly logger = new Logger(ImportController.name);
  constructor(private readonly importService: ImportService) { }

  @Post('task')
  @LogMethod()
  createTask(@Body() body: any) {
    const { musicPath, audiobookPath, cachePath } = body;
    // Basic validation
    if (!cachePath) {
      return { code: 400, message: 'cachePath is required' };
    }

    const id = this.importService.createTask(musicPath || '', audiobookPath || '', cachePath);
    return { code: 200, message: 'success', data: { id } };
  }

  @Get('task/:id')
  @LogMethod()
  getTask(@Param('id') id: string) {
    const task = this.importService.getTask(id);
    if (!task) {
      return { code: 404, message: 'Task not found' };
    }
    return { code: 200, message: 'success', data: task };
  }
}
