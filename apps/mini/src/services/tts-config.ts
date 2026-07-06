import { ISuccessResponse } from '../models';
import request from '../utils/request';

const TTS_BASE = '/tts/api/settings';

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
  return request.get(`${TTS_BASE}/providers`);
};

export const getTtsProviderConfigs = (): Promise<{
  configs: Record<string, TtsProviderConfig>;
}> => {
  return request.get(`${TTS_BASE}/configs`);
};

export const getTtsProviderConfig = (provider: string): Promise<{
  provider: string;
  config: TtsProviderConfig;
}> => {
  return request.get(`${TTS_BASE}/configs/${provider}`);
};

export const saveTtsProviderConfig = (provider: string, config: TtsProviderConfig) => {
  return request.post<any, ISuccessResponse<{ provider: string; config: TtsProviderConfig }>>(
    `${TTS_BASE}/configs/${provider}`,
    { config },
  );
};

export const deleteTtsProviderConfig = (provider: string) => {
  return request.delete(`${TTS_BASE}/configs/${provider}`);
};
