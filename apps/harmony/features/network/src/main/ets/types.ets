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

export interface RequestInterceptor {
  (config: RequestConfig): RequestConfig | Promise<RequestConfig>;
}

export interface ResponseInterceptor {
  (response: HttpResponse<unknown>): HttpResponse<unknown> | Promise<HttpResponse<unknown>>;
}

export interface ErrorInterceptor {
  (error: HttpError): HttpError | Promise<HttpError>;
}