import { httpClient } from '../HarmonyHttpClient';

/**
 * TTS 服务商配置相关接口。
 * 字段与返回结构对齐 packages/services/src/ttsConfig.ts（mobile/desktop 共用）。
 */
export interface TtsProviderOption {
  id: string;
  name: string;
}

export interface TtsProviderConfig {
  api_key?: string;
  api_token?: string;
  app_id?: string;
  group_id?: string;
  model?: string;
}

export interface TtsSupportedProvidersResp {
  providers: TtsProviderOption[];
}

export interface TtsProviderConfigsResp {
  configs: Record<string, TtsProviderConfig>;
}

export interface TtsProviderConfigResp {
  provider: string;
  config: TtsProviderConfig;
}

export interface TtsProviderTestResp {
  provider: string;
  ok: boolean;
}

interface SaveConfigBody {
  config: TtsProviderConfig;
}

export interface TtsConfigApi {
  /** 获取支持自定义配置的 TTS 服务商列表 */
  getSupportedProviders(): Promise<TtsSupportedProvidersResp>;
  /** 获取所有服务商配置 */
  getProviderConfigs(): Promise<TtsProviderConfigsResp>;
  /** 获取单个服务商配置 */
  getProviderConfig(provider: string): Promise<TtsProviderConfigResp>;
  /** 保存服务商配置 */
  saveProviderConfig(provider: string, config: TtsProviderConfig): Promise<TtsProviderConfigResp>;
  /** 测试服务商配置连通性 */
  testProviderConfig(provider: string, config?: TtsProviderConfig): Promise<TtsProviderTestResp>;
  /** 删除服务商配置 */
  deleteProviderConfig(provider: string): Promise<void>;
}

class TtsConfigApiImpl implements TtsConfigApi {
  private readonly BASE: string = '/tts/api/settings';

  async getSupportedProviders(): Promise<TtsSupportedProvidersResp> {
    return httpClient.get<TtsSupportedProvidersResp>(`${this.BASE}/providers`);
  }

  async getProviderConfigs(): Promise<TtsProviderConfigsResp> {
    return httpClient.get<TtsProviderConfigsResp>(`${this.BASE}/configs`);
  }

  async getProviderConfig(provider: string): Promise<TtsProviderConfigResp> {
    return httpClient.get<TtsProviderConfigResp>(`${this.BASE}/configs/${provider}`);
  }

  async saveProviderConfig(provider: string, config: TtsProviderConfig): Promise<TtsProviderConfigResp> {
    const body: SaveConfigBody = { config };
    return httpClient.post<TtsProviderConfigResp>(`${this.BASE}/configs/${provider}`, body);
  }

  async testProviderConfig(provider: string, config?: TtsProviderConfig): Promise<TtsProviderTestResp> {
    const body: SaveConfigBody = { config: config ?? {} };
    return httpClient.post<TtsProviderTestResp>(`${this.BASE}/configs/${provider}/test`, body);
  }

  async deleteProviderConfig(provider: string): Promise<void> {
    return httpClient.del<void>(`${this.BASE}/configs/${provider}`);
  }
}

export const ttsConfigApi: TtsConfigApi = new TtsConfigApiImpl();
