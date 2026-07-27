import media from '@ohos.multimedia.media';
import { BusinessError } from '@ohos.base';
import { Logger } from 'audiodock_common';
import type { IAudioPlayer, PlayerEvent, PlayerListener, PlayerPayload,
  TimeUpdatePayload, StateChangePayload, ErrorPayload, BufferingPayload } from './IAudioPlayer';

export class AVPlayerBackend implements IAudioPlayer {
  private player: media.AVPlayer | null = null;
  private listeners = new Map<PlayerEvent, Set<PlayerListener>>();
  private currentUrl: string = '';
  private prepareResolve: (() => void) | null = null;
  private prepareReject: ((err: Error) => void) | null = null;

  private async ensure(): Promise<media.AVPlayer> {
    if (this.player) return this.player;
    this.player = await media.createAVPlayer();
    this.bindInternal();
    return this.player;
  }

  async load(url: string, _headers?: Record<string, string>): Promise<void> {
    const p = await this.ensure();
    this.currentUrl = url;
    if (p.url !== url) p.url = url;
    return new Promise<void>((resolve, reject) => {
      this.prepareResolve = resolve;
      this.prepareReject = reject;
      p.prepare();
    });
  }

  async play(): Promise<void> { (await this.ensure()).play(); }
  async pause(): Promise<void> { (await this.ensure()).pause(); }
  async stop(): Promise<void> { (await this.ensure()).stop(); }
  async release(): Promise<void> {
    if (this.player) { await this.player.release(); this.player = null; }
  }
  async seek(positionMs: number): Promise<void> {
    (await this.ensure()).seek(positionMs);
  }
  async setSpeed(speed: number): Promise<void> {
    (await this.ensure()).setSpeed(speed);
  }
  async setVolume(v: number): Promise<void> {
    (await this.ensure()).setVolume(v);
  }

  on(event: PlayerEvent, cb: PlayerListener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
  }

  off(event: PlayerEvent, cb?: PlayerListener): void {
    const set = this.listeners.get(event);
    if (!set) return;
    if (cb) set.delete(cb); else set.clear();
  }

  private bindInternal(): void {
    const p = this.player;
    if (!p) return;
    p.on('timeUpdate', (ms: number) => {
      const pl: TimeUpdatePayload = { currentMs: ms, durationMs: p.duration };
      this.dispatch('timeUpdate', pl);
    });
    p.on('durationUpdate', (ms: number) => {
      const pl: TimeUpdatePayload = { currentMs: p.currentTime, durationMs: ms };
      this.dispatch('durationUpdate', pl);
    });
    p.on('stateChange', (s: media.AVPlayerState) => {
      const pl: StateChangePayload = { state: s as string };
      this.dispatch('stateChange', pl);
      if (s === 'prepared' && this.prepareResolve) {
        const r = this.prepareResolve;
        this.prepareResolve = null;
        this.prepareReject = null;
        r();
      } else if (s === 'error' && this.prepareReject) {
        const r = this.prepareReject;
        this.prepareResolve = null;
        this.prepareReject = null;
        r(new Error('AVPlayer prepare failed'));
      }
    });
    p.on('error', (err: BusinessError) => {
      const pl: ErrorPayload = { message: err.message };
      this.dispatch('error', pl);
    });
    p.on('bufferingUpdate', (_infoType: media.BufferingInfoType, value: number) => {
      const pl: BufferingPayload = { value: value };
      this.dispatch('bufferingUpdate', pl);
    });
    p.on('endOfStream', () => this.dispatch('ended', null));
  }

  private dispatch(event: PlayerEvent, payload: PlayerPayload): void {
    const set = this.listeners.get(event);
    if (set) for (const cb of set) cb(payload);
    Logger.d('AVPlayer', `${event}`);
  }
}

export const audioBackend = new AVPlayerBackend();