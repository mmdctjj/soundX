import ws from '@ohos.net.WebSocket';
import { Logger } from 'audiodock_common';

export interface SocketConnectOptions {
  url: string;
  token?: string;
  userId?: string | number;
  deviceName?: string;
  query?: Record<string, string>;
}

type Listener = (payload: unknown) => void;

export class HarmonySocketService {
  private wsObj: ws.WebSocket | null = null;
  private url: string = '';
  private connected: boolean = false;
  private manualClose: boolean = false;
  private reconnectAttempt: number = 0;
  private maxReconnectMs: number = 30_000;
  private listeners = new Map<string, Set<Listener>>();
  private reconnectTimer: number | null = null;

  async connect(opts: SocketConnectOptions): Promise<void> {
    this.manualClose = false;
    this.url = this.buildUrl(opts);
    await this.openSocket();
  }

  disconnect(): void {
    this.manualClose = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.wsObj) {
      try { this.wsObj.close({ code: 1000, reason: 'manual' }); } catch { /* noop */ }
      this.wsObj = null;
    }
    this.connected = false;
  }

  on(event: string, cb: Listener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
  }

  off(event: string, cb?: Listener): void {
    const set = this.listeners.get(event);
    if (!set) return;
    if (cb) set.delete(cb); else set.clear();
  }

  emit(event: string, payload: unknown): void {
    if (!this.wsObj || !this.connected) {
      Logger.w('Socket', `emit ${event} while disconnected`);
      return;
    }
    try {
      this.wsObj.send(JSON.stringify({ event, payload }));
    } catch (e) {
      Logger.e('Socket', `emit ${event} failed: ${String(e)}`);
    }
  }

  isConnected(): boolean { return this.connected; }

  private async openSocket(): Promise<void> {
    this.wsObj = ws.createWebSocket();
    this.wsObj.on('open', () => {
      this.connected = true;
      this.reconnectAttempt = 0;
      Logger.i('Socket', 'connected');
      this.dispatch('connect', null);
    });
    this.wsObj.on('message', (data: string | ArrayBuffer) => {
      const text = typeof data === 'string' ? data : '';
      if (!text) return;
      try {
        const parsed = JSON.parse(text) as { event?: string; payload?: unknown };
        if (parsed.event) this.dispatch(parsed.event, parsed.payload);
      } catch (e) {
        Logger.w('Socket', `bad message: ${String(e)}`);
      }
    });
    this.wsObj.on('close', () => {
      this.connected = false;
      Logger.w('Socket', 'closed');
      this.dispatch('disconnect', null);
      if (!this.manualClose) this.scheduleReconnect();
    });
    this.wsObj.on('error', (err: string) => {
      Logger.e('Socket', `error: ${err}`);
    });
    try {
      await this.wsObj.connect(this.url, undefined);
    } catch (e) {
      Logger.e('Socket', `connect failed: ${String(e)}`);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), this.maxReconnectMs);
    this.reconnectAttempt += 1;
    Logger.i('Socket', `reconnect in ${delay}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket().catch(() => undefined);
    }, delay) as unknown as number;
  }

  private dispatch(event: string, payload: unknown): void {
    const set = this.listeners.get(event);
    if (set) for (const cb of set) cb(payload);
    // also dispatch to wildcard
    const wild = this.listeners.get('*');
    if (wild) for (const cb of wild) cb({ event, payload });
  }

  private buildUrl(opts: SocketConnectOptions): string {
    let u = opts.url;
    const q: string[] = [];
    if (opts.token) q.push(`token=${encodeURIComponent(opts.token)}`);
    if (opts.userId !== undefined) q.push(`userId=${encodeURIComponent(String(opts.userId))}`);
    if (opts.deviceName) q.push(`deviceName=${encodeURIComponent(opts.deviceName)}`);
    if (opts.query) for (const [k, v] of Object.entries(opts.query)) q.push(`${k}=${encodeURIComponent(v)}`);
    if (q.length) u += `${u.includes('?') ? '&' : '?'}${q.join('&')}`;
    return u;
  }
}

export const socketService = new HarmonySocketService();
