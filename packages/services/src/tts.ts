import { getBaseURL, request } from "./request";

const TTS_BASE_URL = "/tts";

// ===== 类型定义扩展 =====

export interface TtsProvider {
  /** 服务商标识 */
  id: string;
  /** 服务商显示名称 */
  name: string;
}

export interface TtsVoice {
  /** 音色ID */
  id: string;
  /** 音色名称 */
  name: string;
  /** 性别 */
  gender?: "male" | "female";
}

export interface TtsFileItem {
  filename: string;
  full_path: string;
  is_generated: boolean;
}

export interface TtsReviewItem {
  key: string;
  filename: string;
  full_path: string;
  title: string;
  author: string;
  voice: string;
  provider?: string;
  temp_path?: string;
  file_id?: string;
}

export interface TtsTask {
  id: string;
  book_name: string;
  author: string;
  status: "pending" | "processing" | "completed" | "paused" | "failed";
  total_chapters: number;
  completed_chapters: number;
  created_at: string;
  provider?: string;
  voice?: string;
  speed?: number;
}

export interface CreateTtsTaskRequest {
  book_name: string;
  author?: string;
  file_path: string;
  /** 服务商标识 */
  provider: string;
  /** 音色ID */
  voice: string;
  /** 语速 */
  speed?: number;
}

// ===== API 函数 =====

/**
 * 获取所有支持的 TTS 服务商列表
 */
export const getTtsProviders = (): Promise<{
  providers: TtsProvider[];
}> => {
  return request.get(`${TTS_BASE_URL}/api/tasks/providers`);
};

/**
 * 获取音色列表（按服务商过滤）
 */
export const getTtsVoices = (
  provider: string = "edge"
): Promise<{
  provider: string;
  voices: TtsVoice[];
}> => {
  return request.get(`${TTS_BASE_URL}/api/tasks/voices`, {
    params: { provider },
  });
};

export const getTtsLocalFiles = (): Promise<{ success: boolean; files: TtsFileItem[] }> => {
  return request.get(`${TTS_BASE_URL}/api/tasks/list-files`);
};

export const uploadTtsFile = (file: any): Promise<{
  success: boolean;
  filename: string;
  temp_path: string;
  title?: string;
  author?: string;
  file_id?: string;
}> => {
  const formData = new FormData();
  formData.append("file", file);
  return request.post(`${TTS_BASE_URL}/api/tasks/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const identifyTtsBatch = (paths: string[]): Promise<{
  success: boolean;
  results: Array<{
    filename: string;
    full_path: string;
    title: string;
    author: string;
  }>;
}> => {
  return request.post(`${TTS_BASE_URL}/api/tasks/identify-batch`, { paths });
};

export const createTtsBatchTasks = (files: Array<{
  full_path: string;
  title: string;
  author: string;
  voice: string;
  provider?: string;
  file_id?: string;
  temp_path?: string;
}>): Promise<{ success: boolean; count: number }> => {
  return request.post(`${TTS_BASE_URL}/api/tasks/batch-create`, { files });
};

export const getTtsTasks = (): Promise<{ tasks: TtsTask[] }> => {
  return request.get(`${TTS_BASE_URL}/api/tasks/`);
};

export const pauseTtsTask = (id: string) => {
  return request.post(`${TTS_BASE_URL}/api/tasks/${id}/pause`);
};

export const resumeTtsTask = (id: string) => {
  return request.post(`${TTS_BASE_URL}/api/tasks/${id}/resume`);
};

export const deleteTtsTask = (id: string) => {
  return request.delete(`${TTS_BASE_URL}/api/tasks/${id}`);
};

export const getTtsPreviewUrl = async (
  voice: string,
  provider: string = "edge",
  text?: string
): Promise<string> => {
  const baseURL = getBaseURL().replace(/\/$/, "");
  const query = new URLSearchParams({
    voice,
    provider,
    t: String(Date.now()),
  });

  if (text) {
    query.set("text", text);
  }

  const path = `${TTS_BASE_URL}/api/tasks/preview?${query.toString()}`;
  return baseURL ? `${baseURL}${path}` : path;
};
