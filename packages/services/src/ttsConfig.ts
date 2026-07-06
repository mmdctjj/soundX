import { request, getBaseURL } from "./request";

const TTS_BASE_URL = "/tts/api/settings";

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
  [k: string]: any;
}

export const getTtsSupportedProviders = (): Promise<{
  providers: TtsProviderOption[];
}> => {
  return request.get(`${TTS_BASE_URL}/providers`);
};

export const getTtsProviderConfigs = (): Promise<{
  configs: Record<string, TtsProviderConfig>;
}> => {
  return request.get(`${TTS_BASE_URL}/configs`);
};

export const getTtsProviderConfig = (
  provider: string,
): Promise<{ provider: string; config: TtsProviderConfig }> => {
  return request.get(`${TTS_BASE_URL}/configs/${provider}`);
};

export const saveTtsProviderConfig = (
  provider: string,
  config: TtsProviderConfig,
): Promise<{ provider: string; config: TtsProviderConfig }> => {
  return request.post(`${TTS_BASE_URL}/configs/${provider}`, { config });
};

export const deleteTtsProviderConfig = (provider: string) => {
  return request.delete(`${TTS_BASE_URL}/configs/${provider}`);
};
