import { httpClient } from '../HarmonyHttpClient';

/**
 * 库导入/精简任务相关接口，对齐 packages/services/src/import.ts + taskCenter.ts。
 * 后端通过 `/import` 前缀提供；mobile/desktop 共用同一服务。
 */

export type TaskStatus = 'INITIALIZING' | 'PREPARING' | 'PARSING' | 'SUCCESS' | 'FAILED';

export type ImportTaskType = 'full' | 'incremental' | 'compact' | 'webdav-sync';
export type ImportTaskMode = 'incremental' | 'full' | 'compact';

export interface ImportTask {
  id: string;
  status: TaskStatus;
  message?: string;
  mode?: ImportTaskMode;
  type?: ImportTaskType;
  createdAt?: string;
  total?: number;
  current?: number;
  localTotal?: number;
  localCurrent?: number;
  webdavTotal?: number;
  webdavCurrent?: number;
  mvTotal?: number;
  mvCurrent?: number;
  currentFileName?: string;
}

export interface CreateTaskParams {
  mode?: ImportTaskMode;
  musicPath?: string;
  audiobookPath?: string;
  cachePath?: string;
}

export interface CreateTaskResponse {
  id: string;
}

export type UnifiedTaskStatus =
  | 'pending'
  | 'processing'
  | 'paused'
  | 'success'
  | 'failed';

export type UnifiedTaskCategory = 'full' | 'incremental' | 'compact' | 'webdav-sync' | 'tts';

export interface UnifiedTask {
  id: string;
  source: 'import' | 'tts';
  category: UnifiedTaskCategory;
  title: string;
  subtitle?: string;
  status: UnifiedTaskStatus;
  progress: number;
  createdAt?: string;
  raw?: ImportTask;
}

interface TaskStatusI18nKeyMap {
  pending: string;
  processing: string;
  paused: string;
  success: string;
  failed: string;
}

export const TASK_STATUS_I18N_KEY: TaskStatusI18nKeyMap = {
  pending: 'taskCenter.status.pending',
  processing: 'taskCenter.status.processing',
  paused: 'taskCenter.status.paused',
  success: 'taskCenter.status.success',
  failed: 'taskCenter.status.failed',
};

function normalizeImportStatus(s: TaskStatus): UnifiedTaskStatus {
  if (s === 'SUCCESS') return 'success';
  if (s === 'FAILED') return 'failed';
  return 'processing';
}

function importCategory(t: ImportTask): UnifiedTaskCategory {
  const v: string = (t.type ?? t.mode ?? 'incremental') as string;
  if (v === 'full' || v === 'incremental' || v === 'compact' || v === 'webdav-sync') {
    return v;
  }
  return 'incremental';
}

function importProgress(t: ImportTask, status: UnifiedTaskStatus): number {
  if (status === 'success') return 100;
  if (status === 'failed') return 0;
  const total = t.total ?? 0;
  const current = t.current ?? 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

export function toUnifiedFromImport(t: ImportTask): UnifiedTask {
  const status = normalizeImportStatus(t.status);
  return {
    id: t.id,
    source: 'import',
    category: importCategory(t),
    title: '',
    subtitle: t.currentFileName || t.message,
    status,
    progress: importProgress(t, status),
    createdAt: t.createdAt,
    raw: t,
  };
}

/** 进行中：pending / processing / paused。用于入口显隐与列表高亮。 */
export function isTaskActive(t: UnifiedTask): boolean {
  return t.status === 'pending' || t.status === 'processing' || t.status === 'paused';
}

export interface TaskApi {
  createImportTask(params: CreateTaskParams): Promise<CreateTaskResponse>;
  createCompactTask(): Promise<CreateTaskResponse>;
  getImportTask(id: string): Promise<ImportTask>;
  getRunningImportTask(): Promise<ImportTask | null>;
  getImportTasks(): Promise<ImportTask[]>;
  hasActiveImportTasks(): Promise<boolean>;
}

class TaskApiImpl implements TaskApi {
  private readonly BASE: string = '/import';

  async createImportTask(params: CreateTaskParams): Promise<CreateTaskResponse> {
    const body: Record<string, string> = {};
    if (params.mode !== undefined) body['mode'] = params.mode;
    if (params.musicPath !== undefined) body['musicPath'] = params.musicPath;
    if (params.audiobookPath !== undefined) body['audiobookPath'] = params.audiobookPath;
    if (params.cachePath !== undefined) body['cachePath'] = params.cachePath;
    return httpClient.post<CreateTaskResponse>(`${this.BASE}/task`, body);
  }

  async createCompactTask(): Promise<CreateTaskResponse> {
    return this.createImportTask({ mode: 'compact' });
  }

  async getImportTask(id: string): Promise<ImportTask> {
    return httpClient.get<ImportTask>(`${this.BASE}/task/${id}`);
  }

  async getRunningImportTask(): Promise<ImportTask | null> {
    try {
      return await httpClient.get<ImportTask>(`${this.BASE}/current-task`);
    } catch (e) {
      const msg: string = e instanceof Error ? e.message : String(e);
      if (msg.indexOf('404') >= 0 || msg.indexOf('not found') >= 0) return null;
      throw new Error(`getRunningImportTask failed: ${msg}`);
    }
  }

  async getImportTasks(): Promise<ImportTask[]> {
    const rec: Record<string, string | number | boolean> = {};
    rec['_t'] = Date.now();
    return httpClient.get<ImportTask[]>(`${this.BASE}/tasks`, rec);
  }

  /** 是否存在进行中的导入任务。TTS 由 ttsApi 单独判断。 */
  async hasActiveImportTasks(): Promise<boolean> {
    const tasks = await this.getImportTasks();
    for (const t of tasks) {
      const u = toUnifiedFromImport(t);
      if (isTaskActive(u)) return true;
    }
    return false;
  }
}

export const taskApi: TaskApi = new TaskApiImpl();