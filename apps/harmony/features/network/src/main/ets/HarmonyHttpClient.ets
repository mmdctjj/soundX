import http from '@ohos.net.http';
import { Logger } from 'audiodock_common';
import { HttpError } from './HttpError';
import type {
  RequestConfig, HttpResponse,
  BackendEnvelope, RequestInterceptor, ResponseInterceptor, ErrorInterceptor,
} from './types';

const DEFAULT_TIMEOUT = 30_000;
const RETRY_DELAY_MS = 800;

export class HarmonyHttpClient {
  private baseURL: string = '';
  private defaultHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  private authToken: string | null = null;
  private reqInterceptors: RequestInterceptor[] = [];
  private resInterceptors: ResponseInterceptor[] = [];
  private errInterceptors: ErrorInterceptor[] = [];

  setBaseURL(url: string): void {
    this.baseURL = url.replace(/\/+$/, '');
    Logger.i('HttpClient', `baseURL=${this.baseURL}`);
  }

  getBaseURL(): string { return this.baseURL; }

  setAuthToken(token: string | null): void { this.authToken = token; }

  addRequestInterceptor(i: RequestInterceptor): void { this.reqInterceptors.push(i); }
  addResponseInterceptor(i: ResponseInterceptor): void { this.resInterceptors.push(i); }
  addErrorInterceptor(i: ErrorInterceptor): void { this.errInterceptors.push(i); }

  async request<T>(cfg: RequestConfig): Promise<T> {
    let config: RequestConfig = { ...cfg, timeoutMs: cfg.timeoutMs ?? DEFAULT_TIMEOUT };
    for (const i of this.reqInterceptors) config = await i(config);

    if (config.baseURL === undefined) config.baseURL = this.baseURL;
    if (this.authToken && config.headers?.['Authorization'] === undefined) {
      config.headers = { ...config.headers, Authorization: `Bearer ${this.authToken}` };
    }

    let attempts = 0;
    let lastError: HttpError | null = null;
    while (attempts < (config.retry ? 2 : 1)) {
      let response: HttpResponse<unknown> | null = null;
      try {
        response = await this.attempt(config);
      } catch (e) {
        let err = e instanceof HttpError ? e : new HttpError(0, String(e));
        for (const i of this.errInterceptors) err = await i(err);
        lastError = err;
        attempts += 1;
        if (config.retry && err.status === 0 && attempts < (config.retry ? 2 : 1)) {
          await new Promise<void>((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        throw err;
      }

      if (response === null) break;

      if (config.retry && response.status >= 500 && attempts < 1) {
        attempts += 1;
        await new Promise<void>((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }

      if (response.status < 200 || response.status >= 300) {
        const httpErr = HttpError.fromStatus(response.status, response.data as object | null);
        let finalErr = httpErr;
        for (const i of this.errInterceptors) finalErr = await i(finalErr);
        throw finalErr;
      }

      const env = response.data as BackendEnvelope<T>;
      if (env && typeof env === 'object' && 'code' in env && 'data' in env) {
        if (env.code !== 0) {
          const envErr = new HttpError(response.status, env.message || `code=${env.code}`, env);
          let finalErr = envErr;
          for (const i of this.errInterceptors) finalErr = await i(finalErr);
          throw finalErr;
        }
        return env.data;
      }
      return response.data as T;
    }

    if (lastError) throw lastError;
    throw new HttpError(0, 'request failed without response');
  }

  private async attempt(config: RequestConfig): Promise<HttpResponse<unknown>> {
    const httpReq = http.createHttp();
    const fullUrl = this.buildUrl(config);
    try {
      const mergedHeaders: Record<string, string> = {
        ...this.defaultHeaders,
        ...config.headers,
      };
      const opts: http.HttpRequestOptions = {
        method: config.method as http.RequestMethod,
        header: mergedHeaders,
        readTimeout: config.timeoutMs,
        connectTimeout: config.timeoutMs,
        extraData: typeof config.data === 'string' ? config.data
          : config.data ? JSON.stringify(config.data) : undefined,
      };
      const resp = await httpReq.request(fullUrl, opts);
      let parsed: unknown = resp.result;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { /* keep as string */ }
      }
      const out: HttpResponse<unknown> = {
        status: resp.responseCode,
        data: parsed,
        headers: resp.header as Record<string, string>,
      };
      let final: HttpResponse<unknown> = out;
      for (const i of this.resInterceptors) final = await i(final);
      return final;
    } finally {
      httpReq.destroy();
    }
  }

  async get<T>(url: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return this.request<T>({ method: 'GET', url, params, retry: true });
  }
  async post<T>(url: string, data?: object): Promise<T> {
    return this.request<T>({ method: 'POST', url, data });
  }
  async put<T>(url: string, data?: object): Promise<T> {
    return this.request<T>({ method: 'PUT', url, data });
  }
  async del<T>(url: string): Promise<T> {
    return this.request<T>({ method: 'DELETE', url });
  }

  private buildUrl(cfg: RequestConfig): string {
    const base = cfg.baseURL ?? this.baseURL;
    let path = cfg.url.startsWith('/') ? cfg.url : `/${cfg.url}`;
    let full = `${base}${path}`;
    if (cfg.params && Object.keys(cfg.params).length > 0) {
      const qs = Object.entries(cfg.params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      full += `${full.includes('?') ? '&' : '?'}${qs}`;
    }
    return full;
  }
}

export const httpClient = new HarmonyHttpClient();