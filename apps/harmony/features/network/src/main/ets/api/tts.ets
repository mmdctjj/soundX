import { httpClient } from '../HarmonyHttpClient';

/**
 * TTS 有声书转换相关接口。
 * 字段与返回结构对齐 packages/services/src/tts.ts（mobile/desktop 共用）。
 * 后端通过 `/tts` 前缀代理到 tts 服务。
 */
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
  gender?: string;
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
  status: string; // 'pending' | 'processing' | 'completed' | 'paused' | 'failed'
  total_chapters: number;
  completed_chapters: number;
  created_at: string;
  provider?: string;
  voice?: string;
  speed?: number;
}

export interface TtsProvidersResp {
  providers: TtsProvider[];
}

export interface TtsVoicesResp {
  provider: string;
  voices: TtsVoice[];
}

export interface TtsLocalFilesResp {
  success: boolean;
  files: TtsFileItem[];
}

export interface TtsIdentifyResult {
  filename: string;
  full_path: string;
  title: string;
  author: string;
}

export interface TtsIdentifyBatchResp {
  success: boolean;
  results: TtsIdentifyResult[];
}

export interface TtsBatchCreateFile {
  full_path: string;
  title: string;
  author: string;
  voice: string;
  provider?: string;
  file_id?: string;
  temp_path?: string;
}

export interface TtsBatchCreateResp {
  success: boolean;
  count: number;
}

export interface TtsTasksResp {
  tasks: TtsTask[];
}

interface IdentifyBatchBody {
  paths: string[];
}

interface BatchCreateBody {
  files: TtsBatchCreateFile[];
}

export interface TtsApi {
  /** 获取所有支持的 TTS 服务商列表 */
  getProviders(): Promise<TtsProvidersResp>;
  /** 获取音色列表（按服务商过滤） */
  getVoices(provider: string): Promise<TtsVoicesResp>;
  /** 获取本地待转换文件列表 */
  getLocalFiles(): Promise<TtsLocalFilesResp>;
  /** 批量识别文件元信息（标题/作者） */
  identifyBatch(paths: string[]): Promise<TtsIdentifyBatchResp>;
  /** 批量创建 TTS 任务 */
  createBatchTasks(files: TtsBatchCreateFile[]): Promise<TtsBatchCreateResp>;
  /** 获取 TTS 任务列表 */
  getTasks(): Promise<TtsTasksResp>;
  /** 暂停任务 */
  pauseTask(id: string): Promise<void>;
  /** 恢复任务 */
  resumeTask(id: string): Promise<void>;
  /** 删除任务 */
  deleteTask(id: string): Promise<void>;
  /** 构建音色试听 URL（对齐 mobile getTtsPreviewUrl） */
  getPreviewUrl(voice: string, provider: string, text?: string): string;
}

class TtsApiImpl implements TtsApi {
  private readonly BASE: string = '/tts/api/tasks';

  async getProviders(): Promise<TtsProvidersResp> {
    return httpClient.get<TtsProvidersResp>(`${this.BASE}/providers`);
  }

  async getVoices(provider: string): Promise<TtsVoicesResp> {
    const q: Record<string, string | number | boolean> = {};
    q['provider'] = provider;
    return httpClient.get<TtsVoicesResp>(`${this.BASE}/voices`, q);
  }

  async getLocalFiles(): Promise<TtsLocalFilesResp> {
    return httpClient.get<TtsLocalFilesResp>(`${this.BASE}/list-files`);
  }

  async identifyBatch(paths: string[]): Promise<TtsIdentifyBatchResp> {
    const body: IdentifyBatchBody = { paths };
    return httpClient.post<TtsIdentifyBatchResp>(`${this.BASE}/identify-batch`, body);
  }

  async createBatchTasks(files: TtsBatchCreateFile[]): Promise<TtsBatchCreateResp> {
    const body: BatchCreateBody = { files };
    return httpClient.post<TtsBatchCreateResp>(`${this.BASE}/batch-create`, body);
  }

  async getTasks(): Promise<TtsTasksResp> {
    return httpClient.get<TtsTasksResp>(`${this.BASE}/`);
  }

  async pauseTask(id: string): Promise<void> {
    return httpClient.post<void>(`${this.BASE}/${id}/pause`);
  }

  async resumeTask(id: string): Promise<void> {
    return httpClient.post<void>(`${this.BASE}/${id}/resume`);
  }

  async deleteTask(id: string): Promise<void> {
    return httpClient.del<void>(`${this.BASE}/${id}`);
  }

  getPreviewUrl(voice: string, provider: string, text?: string): string {
    const base = httpClient.getBaseURL().replace(/\/+$/, '');
    const parts: string[] = [
      `voice=${encodeURIComponent(voice)}`,
      `provider=${encodeURIComponent(provider)}`,
      `t=${Date.now()}`,
    ];
    if (text !== undefined && text.length > 0) {
      parts.push(`text=${encodeURIComponent(text)}`);
    }
    const path = `${this.BASE}/preview?${parts.join('&')}`;
    return base.length > 0 ? `${base}${path}` : path;
  }
}

export const ttsApi: TtsApi = new TtsApiImpl();
