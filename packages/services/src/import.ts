import type { ISuccessResponse } from "./models";
import request from "./request";

export enum TaskStatus {
  INITIALIZING = 'INITIALIZING',
  PREPARING = 'PREPARING',
  PARSING = 'PARSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export type ImportTaskType = 'full' | 'incremental' | 'compact' | 'webdav-sync';

export interface ImportTask {
  id: string;
  status: TaskStatus;
  message?: string;
  mode?: 'incremental' | 'full' | 'compact';
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
  serverAddress?: string;
  musicPath?: string;
  audiobookPath?: string;
  cachePath?: string;
  mode?: 'incremental' | 'full' | 'compact';
}

export interface CreateTaskResponse {
  id: string;
}

// 创建导入任务
export const createImportTask = (data: CreateTaskParams) => {
  const { serverAddress, ...taskData } = data;
  return request.post<any, ISuccessResponse<CreateTaskResponse>>(
    "/import/task",
    taskData,
    {
      baseURL: serverAddress,
    }
  );
};

// 创建精简数据任务
export const createCompactTask = (serverAddress?: string) => {
  return createImportTask({
    mode: "compact",
    serverAddress,
  });
};

// 查询任务状态
export const getImportTask = (id: string, serverAddress?: string) => {
  return request.get<any, ISuccessResponse<ImportTask>>(
    `/import/task/${id}`,
    serverAddress ? { baseURL: serverAddress } : undefined
  );
};

// 获取当前正在运行的导入任务
export const getRunningImportTask = (serverAddress?: string) => {
  return request.get<any, ISuccessResponse<ImportTask>>(
    "/import/current-task",
    serverAddress ? { baseURL: serverAddress } : undefined
  );
};

// 获取全部导入任务（进程内内存中的任务，含已完成/失败，按创建时间倒序）
// 注意：这是一个高频轮询接口，且响应可被浏览器缓存（曾出现 304/Memory Cache 返回
// 陈旧空数组导致入口永不显示）。这里加时间戳参数 + no-cache 头强制每次拿最新。
export const getImportTasks = (serverAddress?: string) => {
  return request.get<any, ISuccessResponse<ImportTask[]>>("/import/tasks", {
    ...(serverAddress ? { baseURL: serverAddress } : {}),
    params: { _t: Date.now() },
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
};
