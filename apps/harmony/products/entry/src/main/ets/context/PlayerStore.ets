import { Logger } from 'audiodock_common';
import { audioBackend, findActiveLine, parseLRC } from 'features_player';
import type { LyricLine } from 'features_player';

export interface Track {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  url: string;
  ext?: string;
  coverUrl?: string;
  lyrics?: string;
}

export type PlayMode = 'SEQUENCE' | 'LOOP_LIST' | 'LOOP_SINGLE' | 'SHUFFLE';
export type PlayerState = 'idle' | 'preparing' | 'ready' | 'playing' | 'paused' | 'stopped' | 'error';

export interface PlayerStateView {
  queue: Track[];
  currentIndex: number;
  currentMs: number;
  durationMs: number;
  state: PlayerState;
  isPlaying: boolean;
  playMode: PlayMode;
  speed: number;
  shuffleSeed: number;
  radioMode: boolean;
  activeLyricIndex: number;
  lyrics: LyricLine[];
  currentLyric: string;
}

type Listener = () => void;

export class PlayerStore {
  queue: Track[] = [];
  currentIndex: number = -1;
  currentMs: number = 0;
  durationMs: number = 0;
  state: PlayerState = 'idle';
  isPlaying: boolean = false;
  playMode: PlayMode = 'SEQUENCE';
  speed: number = 1.0;
  shuffleSeed: number = 0;
  radioMode: boolean = false;
  lyrics: LyricLine[] = [];
  activeLyricIndex: number = -1;
  currentLyric: string = '';

  private listeners = new Set<Listener>();

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  view(): PlayerStateView {
    return {
      queue: this.queue, currentIndex: this.currentIndex,
      currentMs: this.currentMs, durationMs: this.durationMs,
      state: this.state, isPlaying: this.isPlaying,
      playMode: this.playMode, speed: this.speed,
      shuffleSeed: this.shuffleSeed, radioMode: this.radioMode,
      activeLyricIndex: this.activeLyricIndex,
      lyrics: this.lyrics, currentLyric: this.currentLyric,
    };
  }

  setLyricsText(raw: string): void {
    this.lyrics = parseLRC(raw);
    this.activeLyricIndex = -1;
    this.currentLyric = '';
    this.notify();
  }

  async playTrackList(tracks: Track[], startIndex: number): Promise<void> {
    if (tracks.length === 0) return;
    this.queue = tracks.slice();
    this.currentIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    await this.loadCurrent();
  }

  async playTrack(track: Track): Promise<void> {
    if (this.queue.length === 0 || this.queue[this.currentIndex]?.id !== track.id) {
      this.queue = [track];
      this.currentIndex = 0;
    }
    await this.loadCurrent();
  }

  async playNext(): Promise<void> {
    if (this.queue.length === 0) return;
    const next = this.computeNextIndex();
    if (next < 0) return;
    this.currentIndex = next;
    await this.loadCurrent();
  }

  async playPrevious(): Promise<void> {
    if (this.queue.length === 0) return;
    if (this.currentMs > 3000) { await audioBackend.seek(0); return; }
    const prev = this.computePrevIndex();
    if (prev < 0) return;
    this.currentIndex = prev;
    await this.loadCurrent();
  }

  async togglePlay(): Promise<void> {
    if (this.state === 'playing') { await audioBackend.pause(); this.isPlaying = false; }
    else { await audioBackend.play(); this.isPlaying = true; }
    this.notify();
  }

  async seek(ms: number): Promise<void> {
    await audioBackend.seek(ms);
    this.currentMs = ms;
    this.notify();
  }

  async setSpeed(s: number): Promise<void> {
    this.speed = s;
    await audioBackend.setSpeed(s);
    this.notify();
  }

  setMode(mode: PlayMode): void { this.playMode = mode; this.notify(); }

  // 对齐 mobile 的 togglePlayMode 循环顺序
  togglePlayMode(): void {
    const order: PlayMode[] = ['SEQUENCE', 'SHUFFLE', 'LOOP_LIST', 'LOOP_SINGLE'];
    const next = order[(order.indexOf(this.playMode) + 1) % order.length];
    this.setMode(next);
  }

  clear(): void {
    this.queue = []; this.currentIndex = -1;
    this.currentMs = 0; this.durationMs = 0;
    this.state = 'idle'; this.isPlaying = false;
    this.lyrics = []; this.activeLyricIndex = -1; this.currentLyric = '';
    audioBackend.stop().catch(() => undefined);
    this.notify();
  }

  private async loadCurrent(): Promise<void> {
    const t = this.queue[this.currentIndex];
    if (!t) return;
    this.state = 'preparing';
    this.notify();
    try {
      await audioBackend.load(t.url);
      await audioBackend.play();
      this.state = 'playing'; this.isPlaying = true;
      // 后端 duration 字段单位是秒，PlayerStore 内部统一用毫秒
      this.durationMs = (t.duration ?? 0) * 1000;
      this.currentMs = 0;
      this.setLyricsText(t.lyrics ?? '');
      Logger.i('PlayerStore', `playing ${t.id} ${t.title}`);
      this.notify();
    } catch (e) {
      this.state = 'error';
      Logger.e('PlayerStore', `load failed: ${String(e)}`);
      this.notify();
    }
  }

  private computeNextIndex(): number {
    if (this.playMode === 'LOOP_SINGLE') return this.currentIndex;
    if (this.playMode === 'SHUFFLE') {
      if (this.queue.length <= 1) return this.currentIndex;
      let i = Math.floor(Math.random() * this.queue.length);
      if (i === this.currentIndex) i = (i + 1) % this.queue.length;
      return i;
    }
    const next = this.currentIndex + 1;
    if (next >= this.queue.length) return this.playMode === 'LOOP_LIST' ? 0 : -1;
    return next;
  }

  private computePrevIndex(): number {
    const prev = this.currentIndex - 1;
    if (prev < 0) return this.playMode === 'LOOP_LIST' ? this.queue.length - 1 : -1;
    return prev;
  }

  // Called by playbackService on AVPlayer events
  onTimeUpdate(ms: number, durationMs: number): void {
    this.currentMs = ms;
    if (durationMs > 0) this.durationMs = durationMs;
    if (this.lyrics.length > 0) {
      const idx = findActiveLine(this.lyrics, ms);
      if (idx !== this.activeLyricIndex) {
        this.activeLyricIndex = idx;
        this.currentLyric = idx >= 0 ? this.lyrics[idx].text : '';
      }
    }
    this.notify();
  }

  onStateChange(s: PlayerState): void {
    this.state = s; this.isPlaying = s === 'playing'; this.notify();
  }

  onEndOfStream(): void {
    if (this.playMode === 'LOOP_SINGLE') {
      audioBackend.seek(0).then(() => audioBackend.play()).catch(() => undefined);
      return;
    }
    this.playNext().catch(() => undefined);
  }

  onError(): void {
    this.state = 'error'; this.notify();
    this.playNext().catch(() => undefined);
  }

  private notify(): void { for (const l of this.listeners) l(); }
}

export const playerStore: PlayerStore = new PlayerStore();
