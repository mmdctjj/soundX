import http from '@ohos.net.http';
import { Logger } from 'audiodock_common';

const PLUS_BASE_URL = 'https://www.audiodock.cn/api';
const DEFAULT_TIMEOUT = 30_000;

interface PlusEnvelope<T> {
  code: number;
  message?: string;
  data: T;
}

export interface PlusLoginResponse {
  token: string;
  userId: string;
}

export interface PlusUserProfile {
  id: string;
  phone?: string;
  mobile?: string;
  vipTier: string;
  vipExpiresAt?: string | null;
}

export interface VipPlanPrice {
  currentPrice: number;
  originalPrice: number;
  discountPercent: number;
}

export interface VipCurrentLowestPriceData {
  name?: string;
  description?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  annual?: VipPlanPrice;
  lifetime?: VipPlanPrice;
}

export interface CouponItem {
  code: string;
  name?: string;
  discountAmount?: number;
  discountPercent?: number;
  expiresAt?: string;
}

export interface CreatePaymentResponse {
  orderId: string;
  paymentUrl?: string;
  wechatPay?: object | null;
  alipayPay?: object | null;
}

let plusToken: string | null = null;

export function setPlusAuthToken(token: string | null): void {
  plusToken = token;
}

export function getPlusAuthToken(): string | null {
  return plusToken;
}

async function plusRequest<T>(method: string, path: string, data?: object, params?: Record<string, string>): Promise<T> {
  const httpReq = http.createHttp();
  let url = `${PLUS_BASE_URL}${path}`;
  if (params) {
    const parts: string[] = [];
    const keys = Object.keys(params);
    for (let i = 0; i < keys.length; i++) {
      parts.push(`${encodeURIComponent(keys[i])}=${encodeURIComponent(params[keys[i]])}`);
    }
    if (parts.length > 0) url += `?${parts.join('&')}`;
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (plusToken) headers['Authorization'] = `Bearer ${plusToken}`;
  try {
    const resp = await httpReq.request(url, {
      method: method as http.RequestMethod,
      header: headers,
      readTimeout: DEFAULT_TIMEOUT,
      connectTimeout: DEFAULT_TIMEOUT,
      extraData: data ? JSON.stringify(data) : undefined,
    });
    let parsed: object = resp.result as object;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed as string); } catch { /* keep */ }
    }
    const env = parsed as PlusEnvelope<T>;
    if (env && typeof env === 'object' && env.code !== undefined) {
      if (env.code !== 200 && env.code !== 201) {
        throw new Error(env.message || `plus api error code=${env.code}`);
      }
      return env.data;
    }
    return parsed as T;
  } finally {
    httpReq.destroy();
  }
}

export interface PlusApi {
  sendCode(phone: string): Promise<void>;
  login(phone: string, code: string): Promise<PlusLoginResponse>;
  getMe(userId: string): Promise<PlusUserProfile>;
  getVipCurrentLowestPrice(): Promise<VipCurrentLowestPriceData>;
  getMyCoupons(): Promise<CouponItem[]>;
  createPayment(userId: string, plan: string, method: string, price: number, couponCode?: string): Promise<CreatePaymentResponse>;
  getVipStatus(userId: string): Promise<{ isVip: boolean; tier: string; expiresAt: string | null }>;
}

class PlusApiImpl implements PlusApi {
  async sendCode(phone: string): Promise<void> {
    await plusRequest<object>('POST', '/auth/send-code', { phone });
  }

  async login(phone: string, code: string): Promise<PlusLoginResponse> {
    return plusRequest<PlusLoginResponse>('POST', '/auth/login', { phone, code });
  }

  async getMe(userId: string): Promise<PlusUserProfile> {
    return plusRequest<PlusUserProfile>('GET', '/users/me', undefined, { userId });
  }

  async getVipCurrentLowestPrice(): Promise<VipCurrentLowestPriceData> {
    return plusRequest<VipCurrentLowestPriceData>('GET', '/vip/current-lowest-price');
  }

  async getMyCoupons(): Promise<CouponItem[]> {
    const res = await plusRequest<{ data: CouponItem[]; total: number }>('GET', '/coupons/mine');
    return res?.data ?? [];
  }

  async createPayment(userId: string, plan: string, method: string, price: number, couponCode?: string): Promise<CreatePaymentResponse> {
    const body: Record<string, string | number> = { userId, plan, method, price };
    if (couponCode) body['couponCode'] = couponCode;
    return plusRequest<CreatePaymentResponse>('POST', '/payment/create', body);
  }

  async getVipStatus(userId: string): Promise<{ isVip: boolean; tier: string; expiresAt: string | null }> {
    return plusRequest<{ isVip: boolean; tier: string; expiresAt: string | null }>('GET', '/vip/status', undefined, { userId });
  }
}

export const plusApi: PlusApi = new PlusApiImpl();
