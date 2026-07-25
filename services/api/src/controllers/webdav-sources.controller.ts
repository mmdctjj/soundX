import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Req } from '@nestjs/common';
import { IErrorResponse, ISuccessResponse } from '../common/const';
import { LogMethod } from '../common/log-method.decorator';
import { ImportService } from '../services/import';
import { UserService } from '../services/user';
import { WebDavConfigService, WebDavSource, WebDavSourceInput } from '../services/webdav-config.service';

@Controller('admin/webdav-sources')
export class WebDavSourcesController {
  constructor(
    private readonly userService: UserService,
    private readonly webdavConfig: WebDavConfigService,
    private readonly importService: ImportService,
  ) {}

  private async checkAdmin(userId: number) {
    const user = await this.userService.getUserById(userId);
    if (!user || !user.is_admin) {
      throw new ForbiddenException('需要管理员权限');
    }
  }

  @Get()
  @LogMethod()
  async list(@Req() req: any): Promise<ISuccessResponse<WebDavSource[]> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    const sources = await this.webdavConfig.list();
    return {
      code: 200,
      message: 'success',
      data: sources,
    };
  }

  @Post('test')
  @LogMethod()
  async testConnection(
    @Req() req: any,
    @Body() body: WebDavSourceInput,
  ): Promise<ISuccessResponse<{ success: boolean; message: string }> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    const result = await this.webdavConfig.testConnection(body);
    return {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  @Post()
  @LogMethod()
  async save(
    @Req() req: any,
    @Body() body: { sources?: WebDavSourceInput[] },
  ): Promise<ISuccessResponse<WebDavSource[]> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    if (!body || !Array.isArray(body.sources)) {
      throw new BadRequestException('请求格式错误，期望 sources 数组');
    }
    try {
      // Snapshot the previous sources so we can react to removals/toggles.
      const previous = await this.webdavConfig.list();
      const saved = await this.webdavConfig.save(body.sources as WebDavSource[]);
      // Delete data for removed sources, hide/restore data for disabled/re-enabled ones.
      await this.importService.applyWebDavSourceChanges(previous, saved);
      return {
        code: 200,
        message: 'success',
        data: saved,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        code: 500,
        message,
      };
    }
  }
}