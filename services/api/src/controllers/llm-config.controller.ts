import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
} from '@nestjs/common';
import { IErrorResponse, ISuccessResponse } from '../common/const';
import { LogMethod } from '../common/log-method.decorator';
import { UserService } from '../services/user';
import { LlmConfigService, type LlmConfig } from '../services/llm-config.service';

@Controller('admin/llm-config')
export class LlmConfigController {
  constructor(
    private readonly userService: UserService,
    private readonly llmConfig: LlmConfigService,
  ) {}

  private async checkAdmin(userId: number) {
    const user = await this.userService.getUserById(userId);
    if (!user || !user.is_admin) {
      throw new ForbiddenException('需要管理员权限');
    }
  }

  @Get()
  @LogMethod()
  async get(@Req() req: any): Promise<ISuccessResponse<LlmConfig> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    const cfg = await this.llmConfig.get();
    return { code: 200, message: 'success', data: this.maskConfig(cfg) };
  }

  @Post()
  @LogMethod()
  async save(
    @Req() req: any,
    @Body() body: Partial<LlmConfig>,
  ): Promise<ISuccessResponse<LlmConfig> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('请求格式错误');
    }
    try {
      const saved = await this.llmConfig.save(body);
      return { code: 200, message: 'success', data: this.maskConfig(saved) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { code: 500, message };
    }
  }

  /**
   * 返回给前端时 apiKey 做掩码处理，避免明文回显。
   */
  private maskConfig(cfg: LlmConfig): LlmConfig {
    const masked =
      cfg.apiKey.length > 0
        ? `${cfg.apiKey.slice(0, 3)}***${cfg.apiKey.slice(-3)}`
        : '';
    return { ...cfg, apiKey: masked };
  }
}
