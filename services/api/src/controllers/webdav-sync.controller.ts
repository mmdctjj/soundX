import { Controller, ForbiddenException, Post, Req } from '@nestjs/common';
import { IErrorResponse, ISuccessResponse } from '../common/const';
import { LogMethod } from '../common/log-method.decorator';
import { ImportService } from '../services/import';
import { UserService } from '../services/user';
import { WebDavConfigService } from '../services/webdav-config.service';

@Controller('admin/webdav-sync')
export class WebDavSyncController {
  constructor(
    private readonly userService: UserService,
    private readonly importService: ImportService,
    private readonly webDavConfig: WebDavConfigService,
  ) {}

  private async checkAdmin(userId: number) {
    const user = await this.userService.getUserById(userId);
    if (!user || !user.is_admin) {
      throw new ForbiddenException('需要管理员权限');
    }
  }

  @Post()
  @LogMethod()
  async trigger(@Req() req: any): Promise<ISuccessResponse<{ id: string }> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    const sources = await this.webDavConfig.list();
    if (sources.length === 0) {
      return {
        code: 500,
        message: '请先在 WebDAV 设置中添加至少一个数据源',
      };
    }
    // The sync runs as a standard import task (stored in the shared task map),
    // so clients poll its progress via GET /import/task/:id like full/incremental scans.
    const result = await this.importService.triggerWebDavSync();
    return {
      code: 200,
      message: 'success',
      data: result,
    };
  }
}
