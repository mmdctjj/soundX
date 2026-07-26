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
   * 用 multi-llm-ts 探测 provider/apiKey/baseUrl 是否可用：
   * 调 loadModels 列一次模型,这是一次真实 API 调用但不消耗 token。
   * - input 缺省字段时从 DB/env 当前配置回填
   * - 不会修改 DB,纯只读探测
   */
  async testConnection(input: Partial<LlmConfig>): Promise<{ ok: true; provider: string; modelCount: number } | { ok: false; error: string }> {
    const current = await this.get();
    const provider = (input.provider?.trim() || current.provider || DEFAULTS.provider).toLowerCase();
    const apiKey = input.apiKey?.trim() || current.apiKey;
    const baseUrl = input.baseUrl?.trim() || current.baseUrl;

    if (!apiKey) {
      return { ok: false, error: 'API Key 不能为空' };
    }
    if (!provider) {
      return { ok: false, error: 'Provider 不能为空' };
    }

    const config: any = { apiKey };
    if (baseUrl) config.baseURL = baseUrl;

    try {
      const { loadModels } = await import('multi-llm-ts');
      const models = await loadModels(provider, config);
      const chatCount = models?.chat?.length ?? 0;
      return { ok: true, provider, modelCount: chatCount };
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) };
    }
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
