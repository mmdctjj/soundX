import { Logger } from 'audiodock_common';
import { rdbStore } from 'features_storage';
import type { TrackLikeRow, AlbumLikeRow, TrackHistoryRow } from 'features_storage';
import { httpClient } from 'features_network';
import { authStore } from '../context/AuthStore';

export type SyncKind =
  | 'like_track' | 'unlike_track' | 'like_album' | 'unlike_album' | 'history';

export interface SyncTaskTrackLike { kind: 'like_track'; trackId: string; attempts: number; }
export interface SyncTaskTrackUnlike { kind: 'unlike_track'; trackId: string; attempts: number; }
export interface SyncTaskAlbumLike { kind: 'like_album'; albumId: string; attempts: number; }
export interface SyncTaskAlbumUnlike { kind: 'unlike_album'; albumId: string; attempts: number; }
export interface SyncTaskHistory {
  kind: 'history';
  trackId: string;
  progress: number;
  playedAt: number;
  source: string;
  attempts: number;
}
export type SyncTask =
  | SyncTaskTrackLike | SyncTaskTrackUnlike
  | SyncTaskAlbumLike | SyncTaskAlbumUnlike
  | SyncTaskHistory;

export type EventKind = 'trackLike' | 'albumLike' | 'history';

export interface EventPayloadId { id: string; liked: boolean; }
export interface EventPayloadHistory { trackId: string; progress: number; source: string | null; }
export type EventPayload = EventPayloadId | EventPayloadHistory;

export interface RecordHistoryRow {
  track_id: string;
  progress: number;
  source: string | null;
}

type Listener = (payload: EventPayload) => void;

const MAX_ATTEMPTS = 5;
const DRAIN_INTERVAL_MS = 5000;

export class LikesHistoryService {
  private queue: SyncTask[] = [];
  private listeners: Map<EventKind, Set<Listener>> = new Map();
  private timerId: number = -1;
  private draining: boolean = false;
  private currentTask: SyncTask | null = null;

  constructor() {
    this.start();
  }

  start(): void {
    if (this.timerId !== -1) return;
    this.timerId = setInterval((): void => {
      this.drain().catch((e: Error): void => {
        Logger.w('LikesHistory', `drain: ${e.message}`);
      });
    }, DRAIN_INTERVAL_MS);
  }

  stop(): void {
    if (this.timerId !== -1) {
      clearInterval(this.timerId);
      this.timerId = -1;
    }
  }

  // --- Track likes -------------------------------------------------------
  async likeTrack(trackId: string): Promise<void> {
    await rdbStore.likeTrack(trackId);
    const task: SyncTaskTrackLike = { kind: 'like_track', trackId: trackId, attempts: 0 };
    this.queue.push(task);
    const payload: EventPayloadId = { id: trackId, liked: true };
    this.emit('trackLike', payload);
  }

  async unlikeTrack(trackId: string): Promise<void> {
    await rdbStore.unlikeTrack(trackId);
    const task: SyncTaskTrackUnlike = { kind: 'unlike_track', trackId: trackId, attempts: 0 };
    this.queue.push(task);
    const payload: EventPayloadId = { id: trackId, liked: false };
    this.emit('trackLike', payload);
  }

  async isTrackLiked(trackId: string): Promise<boolean> {
    return rdbStore.isTrackLiked(trackId);
  }

  async listLikedTracks(): Promise<TrackLikeRow[]> {
    return rdbStore.listLikedTracks();
  }

  // --- Album likes -------------------------------------------------------
  async likeAlbum(albumId: string): Promise<void> {
    await rdbStore.likeAlbum(albumId);
    const task: SyncTaskAlbumLike = { kind: 'like_album', albumId: albumId, attempts: 0 };
    this.queue.push(task);
    const payload: EventPayloadId = { id: albumId, liked: true };
    this.emit('albumLike', payload);
  }

  async unlikeAlbum(albumId: string): Promise<void> {
    await rdbStore.unlikeAlbum(albumId);
    const task: SyncTaskAlbumUnlike = { kind: 'unlike_album', albumId: albumId, attempts: 0 };
    this.queue.push(task);
    const payload: EventPayloadId = { id: albumId, liked: false };
    this.emit('albumLike', payload);
  }

  async isAlbumLiked(albumId: string): Promise<boolean> {
    return rdbStore.isAlbumLiked(albumId);
  }

  async listLikedAlbums(): Promise<AlbumLikeRow[]> {
    return rdbStore.listLikedAlbums();
  }

  // --- History -----------------------------------------------------------
  async recordHistory(row: RecordHistoryRow): Promise<void> {
    const playedAt: number = Date.now();
    await rdbStore.upsertHistory({
      track_id: row.track_id,
      progress: row.progress,
      played_at: playedAt,
      source: row.source,
    });
    const task: SyncTaskHistory = {
      kind: 'history',
      trackId: row.track_id,
      progress: row.progress,
      playedAt: playedAt,
      source: row.source ?? '',
      attempts: 0,
    };
    this.queue.push(task);
    const payload: EventPayloadHistory = { trackId: row.track_id, progress: row.progress, source: row.source };
    this.emit('history', payload);
  }

  async listHistory(limit: number): Promise<TrackHistoryRow[]> {
    return rdbStore.listHistory(limit);
  }

  // --- Event bus ---------------------------------------------------------
  on(kind: EventKind, cb: Listener): () => void {
    if (!this.listeners.has(kind)) this.listeners.set(kind, new Set());
    const set = this.listeners.get(kind) as Set<Listener>;
    set.add(cb);
    return (): void => {
      const s = this.listeners.get(kind);
      if (s) s.delete(cb);
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
      const token: string | null = authStore.state_.token;
      if (!token) {
        if (this.queue.length > 0) {
          Logger.w('LikesHistory', `no auth token, dropping ${this.queue.length} queued tasks`);
          this.queue = [];
        }
        return;
      }
      while (this.queue.length > 0) {
        const task: SyncTask = this.queue[0];
        this.currentTask = task;
        try {
          await this.send(task);
          this.queue.shift();
        } catch (e) {
          task.attempts += 1;
          const msg: string = e instanceof Error ? e.message : String(e);
          Logger.w('LikesHistory', `task ${task.kind} attempt ${task.attempts} failed: ${msg}`);
          if (task.attempts >= MAX_ATTEMPTS) {
            Logger.w('LikesHistory', `dropping ${task.kind} after ${MAX_ATTEMPTS} attempts`);
            this.queue.shift();
          } else {
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
      case 'like_track': {
        const m = new Map<string, string | number | boolean>();
        m.set('liked', true);
        m.set('trackId', task.trackId);
        const body: Record<string, string | number | boolean> = {};
        const keys = Array.from(m.keys());
        for (let i = 0; i < keys.length; i++) {
          body[keys[i]] = m.get(keys[i])!;
        }
        return httpClient.post('/likes/track', body);
      }
      case 'unlike_track': {
        const m = new Map<string, string | number | boolean>();
        m.set('liked', false);
        m.set('trackId', task.trackId);
        const body: Record<string, string | number | boolean> = {};
        const keys = Array.from(m.keys());
        for (let i = 0; i < keys.length; i++) {
          body[keys[i]] = m.get(keys[i])!;
        }
        return httpClient.post('/likes/track', body);
      }
      case 'like_album': {
        const m = new Map<string, string | number | boolean>();
        m.set('liked', true);
        m.set('albumId', task.albumId);
        const body: Record<string, string | number | boolean> = {};
        const keys = Array.from(m.keys());
        for (let i = 0; i < keys.length; i++) {
          body[keys[i]] = m.get(keys[i])!;
        }
        return httpClient.post('/likes/album', body);
      }
      case 'unlike_album': {
        const m = new Map<string, string | number | boolean>();
        m.set('liked', false);
        m.set('albumId', task.albumId);
        const body: Record<string, string | number | boolean> = {};
        const keys = Array.from(m.keys());
        for (let i = 0; i < keys.length; i++) {
          body[keys[i]] = m.get(keys[i])!;
        }
        return httpClient.post('/likes/album', body);
      }
      case 'history': {
        const m = new Map<string, string | number>();
        m.set('trackId', task.trackId);
        m.set('progress', task.progress);
        m.set('playedAt', task.playedAt);
        m.set('source', task.source);
        const body: Record<string, string | number> = {};
        const keys = Array.from(m.keys());
        for (let i = 0; i < keys.length; i++) {
          body[keys[i]] = m.get(keys[i])!;
        }
        return httpClient.post('/track-history', body);
      }
    }
  }

  private emit(kind: EventKind, payload: EventPayload): void {
    const set: Set<Listener> | undefined = this.listeners.get(kind);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(payload);
      } catch (e) {
        const msg: string = e instanceof Error ? e.message : String(e);
        Logger.w('LikesHistory', `listener for ${kind} threw: ${msg}`);
      }
    }
  }
}

export const likesHistory: LikesHistoryService = new LikesHistoryService();
