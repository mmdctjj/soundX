import media from '@ohos.multimedia.media';
import { Logger } from 'audiodock_common';
import type { IAudioPlayer, PlayerEvent, PlayerListener } from './IAudioPlayer';

export class AVPlayerBackend implements IAudioPlayer {
  private player: media.AVPlayer | null = null;
  private listeners = new Map<PlayerEvent, Set<PlayerListener>>();
  private currentUrl: string = '';

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
    p.prepare();
    return new Promise<void>((resolve, reject) => {
      const onState = (s: media.AVPlayerState) => {
        if (s === 'prepared') { resolve(); this.offState(onState); }
        else if (s === 'error') { reject(new Error('AVPlayer prepare failed')); this.offState(onState); }
      };
      this.onState(onState);
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
    p.on('timeUpdate', (ms: number) => this.dispatch('timeUpdate', { currentMs: ms, durationMs: p.duration }));
    p.on('durationUpdate', (ms: number) => this.dispatch('durationUpdate', { currentMs: p.currentTime, durationMs: ms }));
    p.on('stateChange', (s: media.AVPlayerState) => this.dispatch('stateChange', { state: s }));
    p.on('error', (err: { message: string }) => this.dispatch('error', { message: err.message }));
    p.on('bufferingUpdate', (info: { value: number }) => this.dispatch('bufferingUpdate', { value: info.value }));
    p.on('endOfStream', () => this.dispatch('ended', null));
  }

  private onState(_cb: (s: media.AVPlayerState) => void): void {
    // placeholder retained for prepare() promise; real listener is bound in bindInternal()
  }

  private dispatch(event: PlayerEvent, payload: unknown): void {
    const set = this.listeners.get(event);
    if (set) for (const cb of set) cb(payload);
    Logger.d('AVPlayer', `${event}`);
  }
}

export const audioBackend = new AVPlayerBackend();