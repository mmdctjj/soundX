import type { HttpError } from './HttpError';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestConfig {
  method: HttpMethod;
  url: string;
  baseURL?: string;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: object | string;
  timeoutMs?: number;
  retry?: boolean;
}

export interface HttpResponse<T> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export interface BackendEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * 后端 ILoadMoreData<T> 的形状（services/api/src/common/const.ts）。
 * 注意：后端不返回 hasMore，需由 list.length + loadCount 与 total 比较推导。
 */
export interface LoadMoreResp<T> {
  pageSize: number;
  loadCount: number;
  total: number;
  list: T[];
}

/** 后端 ITableData<T> 的形状，/mv/list 等 table-list 类接口使用。 */
export interface TableResp<T> {
  pageSize: number;
  current: number;
  total: number;
  list: T[];
}

export abstract class RequestInterceptor {
  abstract intercept(config: RequestConfig): RequestConfig | Promise<RequestConfig>;
}

export abstract class ResponseInterceptor {
  abstract intercept(response: HttpResponse<Object>): HttpResponse<Object> | Promise<HttpResponse<Object>>;
}

export abstract class ErrorInterceptor {
  abstract intercept(error: HttpError): HttpError | Promise<HttpError>;
}