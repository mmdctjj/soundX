import { kvStore } from 'features_storage';
import { httpClient } from 'features_network';
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

export class AuthStore {
  private state: AuthState = {
    user: null,
    token: null,
    sourceType: 'audiodock',
    serverAddress: '',
  };
  private listeners = new Set<Listener>();

  get state_(): AuthState { return this.state; }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private defaultState(): AuthState {
    return {
      user: null,
      token: null,
      sourceType: this.state.sourceType,
      serverAddress: '',
    };
  }

  async loadFromStorage(): Promise<void> {
    const url = await kvStore.get('serverAddress');
    const sourceType = (await kvStore.get('selectedSourceType')) as SourceType | null;
    if (url) {
      httpClient.setBaseURL(url);
      const normalized = httpClient.getBaseURL();
      const token = await kvStore.get(`token_${normalized}`);
      const userRaw = await kvStore.get(`user_${normalized}`);
      let user: AuthMe | null = null;
      if (userRaw) {
        try {
          user = JSON.parse(userRaw) as AuthMe;
        } catch {
          user = null;
        }
      }
      this.state = {
        serverAddress: normalized,
        sourceType: sourceType ?? 'audiodock',
        token,
        user,
      };
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
    const url = this.state.serverAddress;
    if (!url) return;
    await kvStore.delete(`token_${url}`);
    await kvStore.delete(`user_${url}`);
    await kvStore.delete(`device_${url}`);
    httpClient.setAuthToken(null);
    this.state = this.defaultState();
    this.notify();
  }

  async switchServer(url: string): Promise<void> {
    httpClient.setBaseURL(url);
    const normalized = httpClient.getBaseURL();
    const token = await kvStore.get(`token_${normalized}`);
    const userRaw = await kvStore.get(`user_${normalized}`);
    this.state = {
      serverAddress: normalized,
      sourceType: this.state.sourceType,
      token,
      user: userRaw ? JSON.parse(userRaw) as AuthMe : null,
    };
    httpClient.setAuthToken(token);
    await kvStore.set('serverAddress', normalized);
    this.notify();
  }

  private async persist(res: LoginResponse): Promise<void> {
    const url = httpClient.getBaseURL();
    const user: AuthMe = { id: String(res.id), username: res.username, nickname: res.nickname };
    this.state = {
      serverAddress: url,
      sourceType: this.state.sourceType,
      token: res.token,
      user: user,
    };
    await kvStore.set(`token_${url}`, res.token);
    await kvStore.set(`user_${url}`, JSON.stringify(user));
    if (res.device) await kvStore.set(`device_${url}`, String(res.device.id));
    httpClient.setAuthToken(res.token);
    this.notify();
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}

export const authStore: AuthStore = new AuthStore();