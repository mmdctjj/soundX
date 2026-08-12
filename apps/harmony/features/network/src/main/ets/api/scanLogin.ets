import http from '@ohos.net.http';
import { Logger } from 'audiodock_common';
import { getPlusAuthToken } from './plus';

/**
 * 扫码登录（VIP 功能），对齐 packages/services/src/scan-login.ts。
 * 后端路径 `/scan-login/*`，baseURL 同 plus（https://www.audiodock.cn/api）。
 * 注：mobile 端基于 socket.io 订阅 session 状态；harmony 端无 socket.io 客户端，
 * 所以 subscribeScanLoginSession 用 setInterval 轮询 getScanLoginSession 模拟。
 */

const PLUS_BASE_URL = 'https://www.audiodock.cn/api';
const DEFAULT_TIMEOUT = 30_000;
const TAG = 'ScanLogin';

export interface ScanLoginSourceConfig {
  id: string;
  internal: string;
  external: string;
  name?: string;
}

export interface ScanLoginSourceBundle {
  type: string;
  configs: ScanLoginSourceConfig[];
}

export interface ScanLoginUser {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
}

export interface ScanLoginAuthBundle {
  baseUrl: string;
  sourceType: string;
  token: string;
  user: ScanLoginUser;
  device?: Record<string, string>;
}

export interface ScanLoginPlusBundle {
  token: string;
  userId: string | number;
}

export interface ScanLoginSession {
  sessionId: string;
  secret: string;
  role: 'scanner' | 'target';
  deviceKind: 'mobile' | 'desktop';
  expiresAt: number;
}

export type ScanLoginStatusName =
  | 'waiting_scan'
  | 'waiting_confirm'
  | 'confirmed'
  | 'consumed'
  | 'success'
  | 'failed'
  | 'expired';

export interface ScanLoginSessionStatus extends Omit<ScanLoginSession, 'secret'> {
  status: ScanLoginStatusName;
  deviceName?: string;
  sourceBundles: ScanLoginSourceBundle[];
  hasNativeAuth: boolean;
  hasPlusAuth: boolean;
}

export interface ScanLoginClaimPayload {
  nativeAuth?: ScanLoginAuthBundle | null;
  plusAuth?: ScanLoginPlusBundle | null;
  sourceBundles: ScanLoginSourceBundle[];
  deviceName?: string;
}

export interface ScanLoginConfirmResult {
  nativeAuth: ScanLoginAuthBundle | null;
  plusAuth: ScanLoginPlusBundle | null;
  sourceBundles: ScanLoginSourceBundle[];
}

export interface ScanLoginSelection {
  type: string;
  configIds: string[];
}

interface PlusEnvelope<T> {
  code: number;
  message?: string;
  data: T;
}

interface CreateSessionBody {
  role: 'scanner' | 'target';
  deviceKind: 'mobile' | 'desktop';
}

interface GetSessionParams {
  secret: string;
}

interface ClaimSessionBody {
  secret: string;
  payload: ScanLoginClaimPayload;
}

interface ConfirmSessionBody {
  secret: string;
  selections?: ScanLoginSelection[];
}

interface ConsumeSessionBody {
  secret: string;
  selections?: ScanLoginSelection[];
}

interface ReportSessionBody {
  secret: string;
  success: boolean;
  error?: string;
}

async function plusRequest<T>(method: string, path: string, data?: object, params?: object): Promise<T> {
  const httpReq = http.createHttp();
  let url = `${PLUS_BASE_URL}${path}`;
  if (params) {
    const paramKeys = Object.keys(params);
    if (paramKeys.length > 0) {
      const parts: string[] = [];
      for (let i = 0; i < paramKeys.length; i++) {
        const k = paramKeys[i];
        const value = (params as Record<string, string>)[k];
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(value)}`);
      }
      if (parts.length > 0) url += `?${parts.join('&')}`;
    }
  }
  const headers: Record<string, string> = {};
  headers['Content-Type'] = 'application/json';
  const token = getPlusAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const resp = await httpReq.request(url, {
      method: method as http.RequestMethod,
      header: headers,
      readTimeout: DEFAULT_TIMEOUT,
      connectTimeout: DEFAULT_TIMEOUT,
      extraData: data ? JSON.stringify(data) : '',
    });
    let parsed: object = resp.result as object;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed as string); } catch { /* keep */ }
    }
    const env = parsed as PlusEnvelope<T>;
    if (env && typeof env === 'object' && env.code !== undefined) {
      if (env.code !== 200 && env.code !== 201) {
        throw new Error(env.message || `scan-login error code=${env.code}`);
      }
      return env.data;
    }
    return parsed as T;
  } finally {
    httpReq.destroy();
  }
}

export interface ScanLoginApi {
  createSession(role: 'scanner' | 'target', deviceKind: 'mobile' | 'desktop'): Promise<ScanLoginSession>;
  getSession(sessionId: string, secret: string): Promise<ScanLoginSessionStatus>;
  claim(sessionId: string, secret: string, payload: ScanLoginClaimPayload): Promise<ScanLoginSessionStatus>;
  confirm(sessionId: string, secret: string, selections?: ScanLoginSelection[]): Promise<ScanLoginSessionStatus>;
  consume(sessionId: string, secret: string, selections?: ScanLoginSelection[]): Promise<ScanLoginConfirmResult>;
  report(sessionId: string, secret: string, success: boolean, error?: string): Promise<ScanLoginSessionStatus>;
}

class ScanLoginApiImpl implements ScanLoginApi {
  async createSession(role: 'scanner' | 'target', deviceKind: 'mobile' | 'desktop'): Promise<ScanLoginSession> {
    const body: CreateSessionBody = { role, deviceKind };
    return plusRequest<ScanLoginSession>('POST', '/scan-login/session', body);
  }

  async getSession(sessionId: string, secret: string): Promise<ScanLoginSessionStatus> {
    interface SecretParam {
      secret: string;
    }
    const params: SecretParam = { secret: secret };
    return plusRequest<ScanLoginSessionStatus>('GET', `/scan-login/session/${sessionId}`, undefined, params);
  }

  async claim(sessionId: string, secret: string, payload: ScanLoginClaimPayload): Promise<ScanLoginSessionStatus> {
    const body: ClaimSessionBody = { secret, payload };
    return plusRequest<ScanLoginSessionStatus>('POST', `/scan-login/session/${sessionId}/claim`, body);
  }

  async confirm(sessionId: string, secret: string, selections?: ScanLoginSelection[]): Promise<ScanLoginSessionStatus> {
    const body: ConfirmSessionBody = { secret };
    if (selections !== undefined) body.selections = selections;
    return plusRequest<ScanLoginSessionStatus>('POST', `/scan-login/session/${sessionId}/confirm`, body);
  }

  async consume(sessionId: string, secret: string, selections?: ScanLoginSelection[]): Promise<ScanLoginConfirmResult> {
    const body: ConsumeSessionBody = { secret };
    if (selections !== undefined) body.selections = selections;
    return plusRequest<ScanLoginConfirmResult>('POST', `/scan-login/session/${sessionId}/consume`, body);
  }

  async report(sessionId: string, secret: string, success: boolean, error?: string): Promise<ScanLoginSessionStatus> {
    const body: ReportSessionBody = { secret, success };
    if (error !== undefined) body.error = error;
    return plusRequest<ScanLoginSessionStatus>('POST', `/scan-login/session/${sessionId}/report`, body);
  }
}

export const scanLoginApi: ScanLoginApi = new ScanLoginApiImpl();

/**
 * 订阅 session 状态变化：mobile 端用 socket.io.on('scan_login_session_update:...')，
 * harmony 端无 socket.io 客户端，用 setInterval 轮询 getSession 模拟。
 * 终止态（success/failed/expired）时主动停止轮询并触发回调。
 */
export type ScanLoginUnsubscribe = () => void;

export interface ScanLoginSubscribeOptions {
  intervalMs?: number;
}

export function subscribeScanLoginSession(
  sessionId: string,
  secret: string,
  listener: (status: ScanLoginSessionStatus) => void,
  options?: ScanLoginSubscribeOptions
): ScanLoginUnsubscribe {
  const interval = options?.intervalMs ?? 1500;
  let timer: number | null = null;
  let stopped = false;

  const stop: ScanLoginUnsubscribe = (): void => {
    if (stopped) return;
    stopped = true;
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const poll = async (): Promise<void> => {
    if (stopped) return;
    try {
      const status = await scanLoginApi.getSession(sessionId, secret);
      if (stopped) return;
      listener(status);
      if (status.status === 'success' || status.status === 'failed' || status.status === 'expired') {
        stop();
      }
    } catch (e) {
      Logger.w(TAG, `subscribe poll failed: ${String(e)}`);
    }
  };

  poll();
  timer = setInterval((): void => { poll(); }, interval);

  return stop;
}

/** 占位：mobile 端用 socket.emit 上报；harmony 端走 HTTP /scan-login/.../report。 */
export function reportScanLoginResultViaSocket(
  sessionId: string,
  secret: string,
  success: boolean,
  error?: string
): void {
  // 异步 fire-and-forget；调用方如果关心结果应当 await scanLoginApi.report。
  scanLoginApi.report(sessionId, secret, success, error).catch((e: Error) => {
    Logger.w(TAG, `reportScanLoginResultViaSocket failed: ${String(e)}`);
  });
}