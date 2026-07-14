import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { IErrorResponse, ISuccessResponse } from '../common/const';
import { LogMethod } from '../common/log-method.decorator';
import {
  MetadataPluginService,
  MetadataPriority,
  PluginConfig,
} from '../services/metadata-plugin.service';
import { UserService } from '../services/user';

const ID_PATTERN = /^[A-Za-z0-9__]+$/;

function sanitizePlugins(plugins: PluginConfig[]): PluginConfig[] {
  if (!Array.isArray(plugins)) {
    throw new BadRequestException('plugins 必须是数组');
  }
  const seen = new Set<string>();
  plugins.forEach((p, index) => {
    if (!p || typeof p !== 'object') {
      throw new BadRequestException(`第 ${index + 1} 项不是有效对象`);
    }
    if (!p.id || !ID_PATTERN.test(p.id)) {
      throw new BadRequestException(
        `第 ${index + 1} 项 id 必填且仅允许字母数字、下划线、连字符`,
      );
    }
    if (!p.name) {
      throw new BadRequestException(`第 ${index + 1} 项 name 必填`);
    }
    if (!['http', 'executable', 'builtin'].includes(p.type)) {
      throw new BadRequestException(
        `第 ${index + 1} 项 type 必须是 http/executable/builtin 之一`,
      );
    }
    if (p.type === 'http' && !p.endpoint) {
      throw new BadRequestException(
        `第 ${index + 1} 项 type=http 时 endpoint 必填`,
      );
    }
    if (seen.has(p.id)) {
      throw new BadRequestException(`插件 id 重复: ${p.id}`);
    }
    seen.add(p.id);
  });
  return plugins;
}

@Controller('admin/metadata-plugins')
export class MetadataPluginsController {
  constructor(
    private readonly userService: UserService,
    private readonly pluginService: MetadataPluginService,
  ) {}

  private async checkAdmin(userId: number) {
    const user = await this.userService.getUserById(userId);
    if (!user || !user.is_admin) {
      throw new ForbiddenException('需要管理员权限');
    }
  }

  @Get()
  @LogMethod()
  async list(
    @Req() req: any,
  ): Promise<ISuccessResponse<PluginConfig[]> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    return {
      code: 200,
      message: 'success',
      data: this.pluginService.list(),
    };
  }

  @Put()
  @LogMethod()
  async saveAll(
    @Req() req: any,
    @Body() body: { plugins?: PluginConfig[] },
  ): Promise<ISuccessResponse<PluginConfig[]> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    const plugins = sanitizePlugins(body?.plugins || []);
    try {
      const saved = await this.pluginService.saveAll(plugins);
      return { code: 200, message: 'success', data: saved };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { code: 500, message };
    }
  }

  @Post()
  @LogMethod()
  async create(
    @Req() req: any,
    @Body() body: PluginConfig,
  ): Promise<ISuccessResponse<PluginConfig> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    const [plugin] = sanitizePlugins([body]);
    try {
      const saved = await this.pluginService.create(plugin);
      return { code: 200, message: 'success', data: saved };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { code: 500, message };
    }
  }

  @Patch(':id')
  @LogMethod()
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: Partial<PluginConfig>,
  ): Promise<ISuccessResponse<PluginConfig> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    if (!id || !ID_PATTERN.test(id)) {
      throw new BadRequestException('无效的插件 id');
    }
    try {
      const saved = await this.pluginService.update(id, body || {});
      return { code: 200, message: 'success', data: saved };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { code: 500, message };
    }
  }

  @Delete(':id')
  @LogMethod()
  async remove(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<ISuccessResponse<{ id: string }> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    if (!id || !ID_PATTERN.test(id)) {
      throw new BadRequestException('无效的插件 id');
    }
    try {
      await this.pluginService.remove(id);
      return { code: 200, message: 'success', data: { id } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { code: 500, message };
    }
  }

  @Post('reload')
  @LogMethod()
  async reload(
    @Req() req: any,
  ): Promise<ISuccessResponse<PluginConfig[]> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    await this.pluginService.reload();
    return { code: 200, message: 'success', data: this.pluginService.list() };
  }

  @Get('priority')
  @LogMethod()
  async getPriority(
    @Req() req: any,
  ): Promise<ISuccessResponse<MetadataPriority> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    return {
      code: 200,
      message: 'success',
      data: this.pluginService.getMetadataPriority(),
    };
  }

  @Put('priority')
  @LogMethod()
  async setPriority(
    @Req() req: any,
    @Body() body: { metadataPriority?: MetadataPriority },
  ): Promise<ISuccessResponse<MetadataPriority> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    const priority = body?.metadataPriority;
    if (priority !== 'plugin' && priority !== 'embedded') {
      throw new BadRequestException(
        'metadataPriority 必须是 plugin 或 embedded',
      );
    }
    try {
      const saved = await this.pluginService.setMetadataPriority(priority);
      return { code: 200, message: 'success', data: saved };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { code: 500, message };
    }
  }
}
