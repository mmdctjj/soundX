import rdb from '@ohos.data.relationalStore';
import common from '@ohos.app.ability.common';
import { Logger } from 'audiodock_common';

const STORE_CONFIG: rdb.StoreConfig = {
  name: 'audiodock.db',
  securityLevel: rdb.SecurityLevel.S1,
};

const SCHEMA: rdb.SqlStatements = [
  { sql: `CREATE TABLE IF NOT EXISTS track_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id TEXT NOT NULL,
    progress INTEGER NOT NULL,
    played_at INTEGER NOT NULL,
    source TEXT,
    UNIQUE(track_id, source)
  )`, params: [] },
  { sql: `CREATE TABLE IF NOT EXISTS album_like (
    album_id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  )`, params: [] },
  { sql: `CREATE TABLE IF NOT EXISTS track_like (
    track_id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  )`, params: [] },
  { sql: `CREATE TABLE IF NOT EXISTS audiobook_like (
    audiobook_id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  )`, params: [] },
  { sql: `CREATE TABLE IF NOT EXISTS downloaded_track (
    track_id TEXT PRIMARY KEY,
    local_path TEXT NOT NULL,
    size INTEGER NOT NULL,
    quality TEXT NOT NULL,
    completed_at INTEGER NOT NULL
  )`, params: [] },
  { sql: `CREATE TABLE IF NOT EXISTS search_history (
    keyword TEXT PRIMARY KEY,
    last_used_at INTEGER NOT NULL
  )`, params: [] },
];

export interface TrackHistoryRow {
  track_id: string; progress: number; played_at: number; source: string | null;
}
export interface TrackLikeRow { track_id: string; created_at: number }
export interface AlbumLikeRow { album_id: string; created_at: number }
export interface AudiobookLikeRow { audiobook_id: string; created_at: number }
export interface DownloadedRow {
  track_id: string; local_path: string; size: number;
  quality: string; completed_at: number;
}

export class RdbStore {
  private rdb: rdb.RdbStore | null = null;

  async init(context: common.UIAbilityContext): Promise<void> {
    this.rdb = await rdb.getRdbStore(context, STORE_CONFIG);
    for (const stmt of SCHEMA) {
      await this.rdb.executeSql(stmt.sql, stmt.params);
    }
    Logger.i('RdbStore', 'RDB ready');
  }

  private ensure(): rdb.RdbStore {
    if (!this.rdb) throw new Error('RdbStore not initialized');
    return this.rdb;
  }

  // track_history
  async upsertHistory(row: TrackHistoryRow): Promise<void> {
    const sql = `INSERT OR REPLACE INTO track_history (track_id, progress, played_at, source)
                 VALUES (?, ?, ?, ?)`;
    await this.ensure().executeSql(sql, [row.track_id, row.progress, row.played_at, row.source ?? '']);
  }

  async listHistory(limit: number = 200): Promise<TrackHistoryRow[]> {
    const rs = await this.ensure().querySql(
      `SELECT track_id, progress, played_at, source FROM track_history
       ORDER BY played_at DESC LIMIT ?`, [limit]);
    const out: TrackHistoryRow[] = [];
    while (rs.goToNextRow()) {
      out.push({
        track_id: rs.getString(0), progress: rs.getLong(1),
        played_at: rs.getLong(2), source: rs.getString(3) || null,
      });
    }
    rs.close();
    return out;
  }

  // track_like
  async likeTrack(trackId: string): Promise<void> {
    await this.ensure().executeSql(
      `INSERT OR REPLACE INTO track_like (track_id, created_at) VALUES (?, ?)`,
      [trackId, Date.now()]);
  }

  async unlikeTrack(trackId: string): Promise<void> {
    await this.ensure().executeSql(`DELETE FROM track_like WHERE track_id = ?`, [trackId]);
  }

  async isTrackLiked(trackId: string): Promise<boolean> {
    const rs = await this.ensure().querySql(
      `SELECT 1 FROM track_like WHERE track_id = ?`, [trackId]);
    const exists = rs.goToNextRow();
    rs.close();
    return exists;
  }

  async listLikedTracks(): Promise<TrackLikeRow[]> {
    const rs = await this.ensure().querySql(
      `SELECT track_id, created_at FROM track_like ORDER BY created_at DESC`);
    const out: TrackLikeRow[] = [];
    while (rs.goToNextRow()) out.push({ track_id: rs.getString(0), created_at: rs.getLong(1) });
    rs.close();
    return out;
  }

  // album_like
  async likeAlbum(albumId: string): Promise<void> {
    await this.ensure().executeSql(
      `INSERT OR REPLACE INTO album_like (album_id, created_at) VALUES (?, ?)`,
      [albumId, Date.now()]);
  }

  async unlikeAlbum(albumId: string): Promise<void> {
    await this.ensure().executeSql(`DELETE FROM album_like WHERE album_id = ?`, [albumId]);
  }

  async isAlbumLiked(albumId: string): Promise<boolean> {
    const rs = await this.ensure().querySql(
      `SELECT 1 FROM album_like WHERE album_id = ?`, [albumId]);
    const exists = rs.goToNextRow();
    rs.close();
    return exists;
  }

  // downloaded_track
  async addDownloaded(row: DownloadedRow): Promise<void> {
    await this.ensure().executeSql(
      `INSERT OR REPLACE INTO downloaded_track
       (track_id, local_path, size, quality, completed_at)
       VALUES (?, ?, ?, ?, ?)`,
      [row.track_id, row.local_path, row.size, row.quality, row.completed_at]);
  }

  async removeDownloaded(trackId: string): Promise<void> {
    await this.ensure().executeSql(`DELETE FROM downloaded_track WHERE track_id = ?`, [trackId]);
  }

  async listDownloaded(): Promise<DownloadedRow[]> {
    const rs = await this.ensure().querySql(
      `SELECT track_id, local_path, size, quality, completed_at
       FROM downloaded_track ORDER BY completed_at DESC`);
    const out: DownloadedRow[] = [];
    while (rs.goToNextRow()) {
      out.push({
        track_id: rs.getString(0), local_path: rs.getString(1),
        size: rs.getLong(2), quality: rs.getString(3), completed_at: rs.getLong(4),
      });
    }
    rs.close();
    return out;
  }

  // search_history
  async upsertSearchKeyword(keyword: string): Promise<void> {
    await this.ensure().executeSql(
      `INSERT OR REPLACE INTO search_history (keyword, last_used_at) VALUES (?, ?)`,
      [keyword, Date.now()]);
  }

  async listSearchKeywords(limit: number = 20): Promise<string[]> {
    const rs = await this.ensure().querySql(
      `SELECT keyword FROM search_history ORDER BY last_used_at DESC LIMIT ?`, [limit]);
    const out: string[] = [];
    while (rs.goToNextRow()) out.push(rs.getString(0));
    rs.close();
    return out;
  }

  async clearSearchHistory(): Promise<void> {
    await this.ensure().executeSql(`DELETE FROM search_history`, []);
  }
}

export const rdbStore = new RdbStore();
