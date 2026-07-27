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

export abstract class RequestInterceptor {
  abstract intercept(config: RequestConfig): RequestConfig | Promise<RequestConfig>;
}

export abstract class ResponseInterceptor {
  abstract intercept(response: HttpResponse<Object>): HttpResponse<Object> | Promise<HttpResponse<Object>>;
}

export abstract class ErrorInterceptor {
  abstract intercept(error: HttpError): HttpError | Promise<HttpError>;
}