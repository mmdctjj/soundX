import { Logger } from 'audiodock_common';
import { kvStore } from 'features_storage';
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
  /** 内容类型 MUSIC | AUDIOBOOK，来自 TrackDto.type；用于内容模式切换时的状态归属。 */
  contentType?: string;
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
  /** 当前内容模式 MUSIC | AUDIOBOOK（对齐 mobile PlayModeContext），决定状态持久化的键。 */
  contentMode: string = 'MUSIC';
  /** 已加载进音频后端的曲目 id，用于恢复态下点播放时判断是否需要重新 load。 */
  private loadedTrackId: string = '';

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
    this.applyIncomingContentMode(tracks[Math.max(0, Math.min(startIndex, tracks.length - 1))]);
    this.queue = tracks.slice();
    this.currentIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    this.persistState();
    await this.loadCurrent();
  }

  async playTrack(track: Track): Promise<void> {
    if (this.queue.length === 0 || this.queue[this.currentIndex]?.id !== track.id) {
      this.applyIncomingContentMode(track);
      this.queue = [track];
      this.currentIndex = 0;
      this.persistState();
    }
    await this.loadCurrent();
  }

  /** 新曲目的内容模式与当前不同时，先持久化当前模式状态再切换（对齐 mobile switchContentModeForIncomingTrack）。 */
  private applyIncomingContentMode(track: Track): void {
    const next = track.contentType === 'AUDIOBOOK' ? 'AUDIOBOOK' : 'MUSIC';
    if (next === this.contentMode) return;
    this.persistState();
    this.contentMode = next;
  }

  async playNext(): Promise<void> {
    if (this.queue.length === 0) return;
    const next = this.computeNextIndex();
    if (next < 0) return;
    this.currentIndex = next;
    this.persistState();
    await this.loadCurrent();
  }

  async playPrevious(): Promise<void> {
    if (this.queue.length === 0) return;
    if (this.currentMs > 3000) { await audioBackend.seek(0); return; }
    const prev = this.computePrevIndex();
    if (prev < 0) return;
    this.currentIndex = prev;
    this.persistState();
    await this.loadCurrent();
  }

  async togglePlay(): Promise<void> {
    const cur = this.queue[this.currentIndex];
    if (cur && this.loadedTrackId !== cur.id) {
      // 恢复态（冷启动/内容模式切换后）曲目尚未加载进后端：加载并从记录位置续播
      await this.loadCurrent(this.currentMs);
      return;
    }
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

  setMode(mode: PlayMode): void { this.playMode = mode; this.persistState(); this.notify(); }

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
    this.loadedTrackId = '';
    audioBackend.stop().catch(() => undefined);
    this.persistState();
    this.notify();
  }

  private async loadCurrent(resumeMs: number = 0): Promise<void> {
    const t = this.queue[this.currentIndex];
    if (!t) return;
    this.state = 'preparing';
    this.notify();
    try {
      await audioBackend.load(t.url);
      await audioBackend.play();
      this.loadedTrackId = t.id;
      this.state = 'playing'; this.isPlaying = true;
      // 后端 duration 字段单位是秒，PlayerStore 内部统一用毫秒
      this.durationMs = (t.duration ?? 0) * 1000;
      this.currentMs = resumeMs > 0 ? resumeMs : 0;
      if (resumeMs > 0) {
        audioBackend.seek(resumeMs).catch(() => undefined);
      }
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

  // ─── 持久化（对齐 mobile playbackState_${mode} 机制：音乐/有声书各自独立播放上下文） ───
  private stateKey(): string {
    return `playbackState_${this.contentMode}`;
  }

  private persistState(): void {
    if (this.queue.length === 0) {
      kvStore.set(this.stateKey(), '').catch(() => undefined);
      return;
    }
    const data = JSON.stringify({
      queue: this.queue,
      currentIndex: this.currentIndex,
      playMode: this.playMode,
      currentMs: this.currentMs,
    });
    kvStore.set(this.stateKey(), data).catch(() => undefined);
  }

  /** 切换内容模式：持久化当前模式状态、停止播放，恢复目标模式的状态（对齐 mobile 的 mode 变化 effect）。 */
  async switchContentMode(mode: string): Promise<void> {
    if (mode !== 'MUSIC' && mode !== 'AUDIOBOOK') return;
    if (mode === this.contentMode) return;
    this.persistState();
    this.contentMode = mode;
    audioBackend.stop().catch(() => undefined);
    this.loadedTrackId = '';
    await this.loadPersistedState();
  }

  /** 从当前内容模式的持久化键恢复队列（不自动播放）。 */
  private async loadPersistedState(): Promise<void> {
    try {
      let raw = await kvStore.get(this.stateKey());
      // 旧版本只有一个全局 playbackState 键，音乐模式下做一次迁移读取
      if ((raw === null || raw.length === 0) && this.contentMode === 'MUSIC') {
        raw = await kvStore.get('playbackState');
      }
      if (raw === null || raw.length === 0) {
        this.resetToIdle();
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, Object>;
      const queue = parsed['queue'] as Track[];
      if (!Array.isArray(queue) || queue.length === 0) {
        this.resetToIdle();
        return;
      }
      this.queue = queue;
      this.currentIndex = (parsed['currentIndex'] as number) ?? 0;
      if (this.currentIndex < 0 || this.currentIndex >= queue.length) this.currentIndex = 0;
      const pm = parsed['playMode'] as string;
      if (pm === 'SEQUENCE' || pm === 'LOOP_LIST' || pm === 'LOOP_SINGLE' || pm === 'SHUFFLE') {
        this.playMode = pm;
      }
      this.currentMs = (parsed['currentMs'] as number) ?? 0;
      this.state = 'paused';
      this.isPlaying = false;
      this.durationMs = (queue[this.currentIndex]?.duration ?? 0) * 1000;
      this.setLyricsText(queue[this.currentIndex]?.lyrics ?? '');
      Logger.i('PlayerStore', `restored[${this.contentMode}] ${queue.length} tracks, index=${this.currentIndex}`);
      this.notify();
    } catch (e) {
      Logger.w('PlayerStore', `loadPersistedState failed: ${String(e)}`);
      this.resetToIdle();
    }
  }

  /** 目标模式没有保存的播放状态时回到空态（MiniPlayer 随之隐藏），不触发持久化。 */
  private resetToIdle(): void {
    this.queue = []; this.currentIndex = -1;
    this.currentMs = 0; this.durationMs = 0;
    this.state = 'idle'; this.isPlaying = false;
    this.lyrics = []; this.activeLyricIndex = -1; this.currentLyric = '';
    this.notify();
  }

  /** 应用启动时调用：按首页保存的内容模式恢复对应播放上下文（不自动播放）。 */
  async restoreState(): Promise<void> {
    try {
      const savedMode = await kvStore.get('playMode');
      if (savedMode === 'MUSIC' || savedMode === 'AUDIOBOOK') {
        this.contentMode = savedMode;
      }
    } catch (e) {
      Logger.w('PlayerStore', `read playMode failed: ${String(e)}`);
    }
    await this.loadPersistedState();
  }

  private notify(): void { for (const l of this.listeners) l(); }
}

export const playerStore: PlayerStore = new PlayerStore();
