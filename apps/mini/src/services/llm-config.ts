import { ISuccessResponse } from '../models';
import request from '../utils/request';

export interface LlmProviderOption {
  id: string;
  name: string;
}

export const LLM_PROVIDER_OPTIONS: LlmProviderOption[] = [
  { id: 'deepseek', name: 'DeepSeek' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'gemini', name: 'Google Gemini' },
  { id: 'ollama', name: 'Ollama' },
  { id: 'mistral', name: 'Mistral' },
  { id: 'groq', name: 'Groq' },
  { id: 'openrouter', name: 'OpenRouter' },
  { id: 'custom', name: 'Custom OpenAI 兼容' },
];

export interface LlmConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
}

export const getLlmConfig = () => {
  return request.get<any, ISuccessResponse<LlmConfig>>('/admin/llm-config');
};

export const saveLlmConfig = (payload: Partial<LlmConfig>) => {
  return request.post<any, ISuccessResponse<LlmConfig>>('/admin/llm-config', payload);
};
