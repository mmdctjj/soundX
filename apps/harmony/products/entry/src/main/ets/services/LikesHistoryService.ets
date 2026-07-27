import { Logger } from 'audiodock_common';
import { rdbStore } from 'features_storage';
import { httpClient } from 'features_network';
import { authStore } from '../context/AuthStore';

export type SyncKind =
  | 'like_track' | 'unlike_track' | 'like_album' | 'unlike_album' | 'history';

interface SyncTask {
  kind: SyncKind;
  payload: Record<string, string | number | null>;
  attempts: number;
}

export type EventKind = 'trackLike' | 'albumLike' | 'history';
export type EventPayload =
  | { id: string; liked: boolean }
  | { trackId: string; progress: number; source: string | null };

type Listener = (payload: EventPayload) => void;

const MAX_ATTEMPTS = 5;
const DRAIN_INTERVAL_MS = 5000;
const EMPTY_TOKEN: string | null = null;

export class LikesHistoryService {
  private queue: SyncTask[] = [];
  private listeners = new Map<EventKind, Set<Listener>>();
  private timer: number | null = null;
  private draining: boolean = false;
  private currentTask: SyncTask | null = null;

  constructor() {
    this.start();
  }

  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      this.drain().catch((e: Error) => Logger.w('LikesHistory', `drain: ${e.message}`));
    }, DRAIN_INTERVAL_MS) as unknown as number;
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // --- Track likes -------------------------------------------------------
  async likeTrack(id: string): Promise<void> {
    await rdbStore.likeTrack(id);
    this.enqueue({ kind: 'like_track', payload: { trackId: id }, attempts: 0 });
    this.emit('trackLike', { id, liked: true });
  }

  async unlikeTrack(id: string): Promise<void> {
    await rdbStore.unlikeTrack(id);
    this.enqueue({ kind: 'unlike_track', payload: { trackId: id }, attempts: 0 });
    this.emit('trackLike', { id, liked: false });
  }

  async isTrackLiked(id: string): Promise<boolean> {
    return rdbStore.isTrackLiked(id);
  }

  async listLikedTracks() {
    return rdbStore.listLikedTracks();
  }

  // --- Album likes -------------------------------------------------------
  async likeAlbum(id: string): Promise<void> {
    await rdbStore.likeAlbum(id);
    this.enqueue({ kind: 'like_album', payload: { albumId: id }, attempts: 0 });
    this.emit('albumLike', { id, liked: true });
  }

  async unlikeAlbum(id: string): Promise<void> {
    await rdbStore.unlikeAlbum(id);
    this.enqueue({ kind: 'unlike_album', payload: { albumId: id }, attempts: 0 });
    this.emit('albumLike', { id, liked: false });
  }

  async isAlbumLiked(id: string): Promise<boolean> {
    return rdbStore.isAlbumLiked(id);
  }

  async listLikedAlbums() {
    return rdbStore.listLikedAlbums();
  }

  // --- History -----------------------------------------------------------
  async recordHistory(row: { track_id: string; progress: number; source: string | null }): Promise<void> {
    await rdbStore.upsertHistory({
      track_id: row.track_id,
      progress: row.progress,
      played_at: Date.now(),
      source: row.source,
    });
    this.enqueue({
      kind: 'history',
      payload: {
        trackId: row.track_id,
        progress: row.progress,
        playedAt: Date.now(),
        source: row.source ?? '',
      },
      attempts: 0,
    });
    this.emit('history', { trackId: row.track_id, progress: row.progress, source: row.source });
  }

  async listHistory(limit: number) {
    return rdbStore.listHistory(limit);
  }

  // --- Event bus ---------------------------------------------------------
  on(kind: EventKind, cb: Listener): () => void {
    if (!this.listeners.has(kind)) this.listeners.set(kind, new Set());
    this.listeners.get(kind)!.add(cb);
    return () => {
      const set = this.listeners.get(kind);
      if (set) set.delete(cb);
    };
  }

  // --- Sync queue --------------------------------------------------------
  enqueue(task: SyncTask): void {
    this.queue.push(task);
  }

  queueSize(): number {
    return this.queue.length + (this.currentTask ? 1 : 0);
  }

  async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      const token = authStore.state_.token;
      if (!token) {
        if (this.queue.length > 0) {
          Logger.w('LikesHistory', `no auth token, dropping ${this.queue.length} queued tasks`);
          this.queue = [];
        }
        return;
      }
      while (this.queue.length > 0) {
        const task = this.queue[0];
        this.currentTask = task;
        try {
          await this.send(task);
          this.queue.shift();
        } catch (e) {
          task.attempts += 1;
          Logger.w('LikesHistory', `task ${task.kind} attempt ${task.attempts} failed: ${String(e)}`);
          if (task.attempts >= MAX_ATTEMPTS) {
            Logger.w('LikesHistory', `dropping ${task.kind} after ${MAX_ATTEMPTS} attempts`);
            this.queue.shift();
          } else {
            // leave at head, bail out so next tick retries
            break;
          }
        } finally {
          this.currentTask = null;
        }
      }
    } finally {
      this.draining = false;
    }
  }

  private async send(task: SyncTask): Promise<void> {
    switch (task.kind) {
      case 'like_track':   return httpClient.post('/likes/track', { liked: true,  ...task.payload });
      case 'unlike_track': return httpClient.post('/likes/track', { liked: false, ...task.payload });
      case 'like_album':   return httpClient.post('/likes/album', { liked: true,  ...task.payload });
      case 'unlike_album': return httpClient.post('/likes/album', { liked: false, ...task.payload });
      case 'history':      return httpClient.post('/track-history', task.payload);
    }
  }

  private emit(kind: EventKind, payload: EventPayload): void {
    const set = this.listeners.get(kind);
    if (!set) return;
    for (const cb of set) {
      try { cb(payload); } catch (e) {
        Logger.w('LikesHistory', `listener for ${kind} threw: ${String(e)}`);
      }
    }
  }
}

export const likesHistory = new LikesHistoryService();