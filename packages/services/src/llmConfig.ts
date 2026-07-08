import { request } from "./request";
import type { ISuccessResponse } from "./models";

export interface LlmProviderOption {
  id: string;
  name: string;
}

export const LLM_PROVIDER_OPTIONS: LlmProviderOption[] = [
  { id: "deepseek", name: "DeepSeek" },
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "gemini", name: "Google Gemini" },
  { id: "ollama", name: "Ollama" },
  { id: "mistral", name: "Mistral" },
  { id: "groq", name: "Groq" },
  { id: "openrouter", name: "OpenRouter" },
  { id: "custom", name: "Custom OpenAI 兼容" },
];

export interface LlmConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
}

export const getLlmConfig = async () => {
  return request.get<ISuccessResponse<LlmConfig>>("/admin/llm-config");
};

export const saveLlmConfig = async (payload: Partial<LlmConfig>) => {
  return request.post<ISuccessResponse<LlmConfig>>("/admin/llm-config", payload);
};

export const testLlmConfig = async (payload: Partial<LlmConfig>) => {
  return request.post<
    ISuccessResponse<{ provider: string; modelCount: number }>
  >("/admin/llm-config/test", payload);
};
