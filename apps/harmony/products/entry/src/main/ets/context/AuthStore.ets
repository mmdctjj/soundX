import { Logger } from 'audiodock_common';
import { kvStore } from 'features_storage';
import { httpClient, HttpError } from 'features_network';
import { authApi } from 'features_network';
import type { AuthMe, LoginResponse, LoginDto, RegisterDto } from 'features_network';

type Listener = () => void;

export type SourceType = 'audiodock' | 'subsonic' | 'emby';

export interface AuthState {
  user: AuthMe | null;
  token: string | null;
  sourceType: SourceType;
  serverAddress: string;
}

const DEFAULT: AuthState = {
  user: null, token: null, sourceType: 'audiodock', serverAddress: '',
};

export class AuthStore {
  private state: AuthState = { ...DEFAULT };
  private listeners = new Set<Listener>();

  get state_(): AuthState { return this.state; }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  async loadFromStorage(): Promise<void> {
    const url = await kvStore.get('serverAddress');
    const sourceType = (await kvStore.get('selectedSourceType')) as SourceType | null;
    if (url) {
      const token = await kvStore.get(`token_${url}`);
      const userRaw = await kvStore.get(`user_${url}`);
      this.state = {
        serverAddress: url,
        sourceType: sourceType ?? 'audiodock',
        token,
        user: userRaw ? JSON.parse(userRaw) as AuthMe : null,
      };
      httpClient.setBaseURL(url);
      httpClient.setAuthToken(token);
    }
  }

  async login(dto: LoginDto): Promise<void> {
    const res = await authApi.login(dto);
    await this.persist(res);
  }

  async register(dto: RegisterDto): Promise<void> {
    const res = await authApi.register(dto);
    await this.persist(res);
  }

  async logout(): Promise<void> {
    if (!this.state.serverAddress) return;
    await kvStore.delete(`token_${this.state.serverAddress}`);
    await kvStore.delete(`user_${this.state.serverAddress}`);
    httpClient.setAuthToken(null);
    this.state = { ...DEFAULT };
    this.notify();
  }

  async switchServer(url: string): Promise<void> {
    this.state.serverAddress = url;
    httpClient.setBaseURL(url);
    const token = await kvStore.get(`token_${url}`);
    httpClient.setAuthToken(token);
    await kvStore.set('serverAddress', url);
    this.notify();
  }

  private async persist(res: LoginResponse): Promise<void> {
    const url = httpClient.getBaseURL();
    this.state = { ...this.state, token: res.token, user: res.user };
    await kvStore.set(`token_${url}`, res.token);
    await kvStore.set(`user_${url}`, JSON.stringify(res.user));
    await kvStore.set(`device_${url}`, res.deviceId);
    httpClient.setAuthToken(res.token);
    this.notify();
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}

export const authStore = new AuthStore();