import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@soundx/db';

export interface LlmConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
}

const SETTING_KEY = 'llm_config';

const DEFAULTS: Omit<LlmConfig, 'apiKey' | 'baseUrl'> = {
  provider: 'deepseek',
  model: 'deepseek-chat',
};

@Injectable()
export class LlmConfigService implements OnModuleInit {
  private readonly logger = new Logger(LlmConfigService.name);
  private prisma: PrismaClient;
  private cache: LlmConfig | null = null;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async onModuleInit() {
    // 向后兼容：DB 没记录 / 记录中关键字段为空时，把 env 自动迁移到 DB，
    // 让设置页可以直接看到这些历史配置，老用户不用手工搬运。
    const dbConfig = await this.readFromDb();
    const envConfig = this.buildFromEnv();

    if (!dbConfig) {
      if (envConfig.apiKey || envConfig.provider || envConfig.model || envConfig.baseUrl) {
        await this.writeToDb(envConfig);
        this.logger.log(
          `No LLM config persisted in DB. Seeded from environment variables (legacy compatibility).`,
        );
      }
      return;
    }

    // DB 有记录但缺少关键字段（apiKey 等），用 env 补齐
    const patched: LlmConfig = { ...dbConfig };
    let changed = false;
    if (!patched.apiKey && envConfig.apiKey) {
      patched.apiKey = envConfig.apiKey;
      changed = true;
    }
    if (!patched.baseUrl && envConfig.baseUrl) {
      patched.baseUrl = envConfig.baseUrl;
      changed = true;
    }
    if (changed) {
      await this.writeToDb(patched);
      this.logger.log(
        `LLM config in DB has empty fields; auto-filled from environment variables.`,
      );
    }
  }

  async get(): Promise<LlmConfig> {
    if (this.cache === null) {
      const db = await this.readFromDb();
      this.cache = db ?? this.buildFromEnv();
    }
    return { ...this.cache };
  }

  async save(input: Partial<LlmConfig>): Promise<LlmConfig> {
    const merged: LlmConfig = {
      provider: input.provider?.trim() || DEFAULTS.provider,
      model: input.model?.trim() || DEFAULTS.model,
      apiKey: input.apiKey?.trim() ?? (await this.get()).apiKey,
      baseUrl: input.baseUrl?.trim() ?? (await this.get()).baseUrl,
    };
    await this.writeToDb(merged);
    this.cache = merged;
    return { ...this.cache };
  }

  /**
   * Public: for LlmService 等业务侧读取当前生效配置。
   */
  async getEffective(): Promise<{
    provider: string;
    model: string;
    apiKey: string;
    baseUrl: string;
    timeout: number;
    temperature: number;
    maxTokens: number;
  }> {
    const cfg = await this.get();
    return {
      provider: cfg.provider || DEFAULTS.provider,
      model: cfg.model || DEFAULTS.model,
      apiKey: cfg.apiKey || '',
      baseUrl: cfg.baseUrl || '',
      timeout: Number(process.env.LLM_TIMEOUT) || 60000,
      temperature: Number(process.env.LLM_TEMPERATURE) || 0.7,
      maxTokens: Number(process.env.LLM_MAX_TOKENS) || 2048,
    };
  }

  private async readFromDb(): Promise<LlmConfig | null> {
    const raw = await this.prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw.value);
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        provider: String(parsed.provider ?? DEFAULTS.provider),
        model: String(parsed.model ?? DEFAULTS.model),
        apiKey: String(parsed.apiKey ?? ''),
        baseUrl: String(parsed.baseUrl ?? ''),
      };
    } catch {
      return null;
    }
  }

  private async writeToDb(cfg: LlmConfig) {
    const value = JSON.stringify(cfg);
    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value },
      create: { key: SETTING_KEY, value },
    });
  }

  private buildFromEnv(): LlmConfig {
    return {
      provider: process.env.LLM_PROVIDER || DEFAULTS.provider,
      model: process.env.LLM_MODEL || DEFAULTS.model,
      apiKey: process.env.LLM_API_KEY || '',
      baseUrl: process.env.LLM_BASE_URL || '',
    };
  }
}
