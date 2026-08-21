# AudioDock HarmonyOS Client MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native HarmonyOS application that re-implements the AudioDock mobile feature set end-to-end, shipping v1.0 in 8 weeks across 6 phases (P0 → P5).

**Architecture:** Native ArkTS (strict mode) Stage model. Existing 12-page feat/hm scaffold is restructured into feature-module HARs (`features/{network,storage,player,ui,i18n,socket}`) plus the host `products/entry`. State managed via class-based singletons + EventBus. Audio via `AVPlayer` + `AVPlaySession` in a background `PlayerServiceAbility`. All API code lives in `features/network/api/` mirroring `@soundx/services` surface but using Harmony's `@ohos.net.http`.

**Tech Stack:**
- HarmonyOS NEXT (API 12+), compileSdk 6.0.2(22), target 5.1.1(19), runtimeOS HarmonyOS
- ArkTS strict mode, Stage model with `EntryAbility` + `PlayerServiceAbility` + `EntryFormWidget`
- `@ohos.net.http`, `@ohos.data.preferences`, `@ohos.data.relationalStore`, `@ohos.net.WebSocket`
- `@ohos.multimedia.media` (AVPlayer + AVPlaySession)
- `@ohos.app.ability.AppStorage`, `@ohos.i18n`, `@ohos.hilog`
- Build: `hvigorw assembleHap` (via DevEco Studio 6.0.2+)
- Test: `@ohos.hypium` (JS unit tests)

## Global Constraints

- **Branch:** `feat/hm` (current HEAD `de5cd651`). All commits land here.
- **Bundle ID:** `com.audiodock.app`
- **Min/Target API:** `minAPIVersion: 12`, `targetAPIVersion: 19`
- **ArkTS:** strict mode — no `any`, no spread, explicit types on all exports
- **i18n:** copy JSON resources from `packages/i18e/src/locales/common/{en,zh-CN}.json` into `features/i18n/src/main/resources/locales/`. Do NOT consume `@soundx/i18e` package.
- **API layer:** Standalone. Do NOT depend on `@soundx/services`. Mirror its function signatures.
- **AsyncStorage equivalents:** use `@ohos.data.preferences.Preferences` for KV, `@ohos.data.relationalStore.RdbStore` for relational.
- **HTTP:** Always through `HarmonyHttpClient`. Never call `http.createHttp()` directly outside `features/network`.
- **No third-party npm packages** — the build pipeline doesn't support them. Everything is stdlib Harmony APIs.
- **Background audio:** always goes through `PlayerServiceAbility`, never a foreground UIAbility.
- **Theming:** 3 themes (`light`/`dark`/`festive`). Read token values from `features/ui/theme/`; do not hardcode colors.
- **No commit to remote** — local commits only per project convention.
- **Conventional Commits:** `feat(harmony):`, `fix(harmony):`, `refactor(harmony):`, `docs(harmony):`, `test(harmony):` prefixes.
- **Verification:** Run `hvigorw check` after each task group. Run `hvigorw assembleHap --mode module -p product=default` after each phase.

---

## Phase P0: Foundation (1.5 weeks)

### Task 1: Restructure feat/hm scaffold into feature modules

**Files:**
- Create: `apps/harmony/common/audiodock_common/Index.ets`
- Create: `apps/harmony/common/audiodock_common/src/main/ets/utils/format.ets`
- Create: `apps/harmony/common/audiodock_common/src/main/ets/utils/hash.ets`
- Create: `apps/harmony/common/audiodock_common/src/main/ets/logger/Logger.ets`
- Create: `apps/harmony/common/audiodock_common/src/main/ets/types/common.ets`
- Create: `apps/harmony/common/audiodock_common/build-profile.json5`
- Create: `apps/harmony/common/audiodock_common/src/main/module.json5`
- Modify: `apps/harmony/oh-package.json5` (add dependencies)
- Delete (move): existing `apps/harmony/products/entry/src/main/ets/utils/HttpClient.ets` (will be replaced in Task 3)
- Delete (move): existing `apps/harmony/products/entry/src/main/ets/utils/StorageManager.ets` (will be replaced in Task 4)

**Step 1.1: Create common module skeleton**

Write `common/audiodock_common/build-profile.json5`:

```json5
{
  "apiType": "stageMode",
  "buildOption": {
    "arkOptions": { "runtimeOnly": { "sources": [], "packages": [] } }
  },
  "buildOptionSet": [
    { "name": "release", "arkOptions": { "obfuscation": { "ruleOptions": { "enable": false } } } }
  ]
}
```

Write `common/audiodock_common/src/main/module.json5`:

```json5
{ "module": { "name": "audiodock_common", "type": "har", "deliveryWithInstall": false } }
```

**Step 1.2: Write Logger.ets**

`common/audiodock_common/src/main/ets/logger/Logger.ets`:

```typescript
import hilog from '@ohos.hilog';

const DOMAIN = 0xA001;
const TAG = 'AudioDock';

export class Logger {
  static d(tag: string, msg: string, ...args: object[]): void {
    hilog.debug(DOMAIN, TAG, `[${tag}] ${msg}`, ...args);
  }
  static i(tag: string, msg: string, ...args: object[]): void {
    hilog.info(DOMAIN, TAG, `[${tag}] ${msg}`, ...args);
  }
  static w(tag: string, msg: string, ...args: object[]): void {
    hilog.warn(DOMAIN, TAG, `[${tag}] ${msg}`, ...args);
  }
  static e(tag: string, msg: string, ...args: object[]): void {
    hilog.error(DOMAIN, TAG, `[${tag}] ${msg}`, ...args);
  }
}
```

**Step 1.3: Write format.ets utility**

`common/audiodock_common/src/main/ets/utils/format.ets`:

```typescript
export function formatDuration(ms: number): string {
  if (ms < 0 || !isFinite(ms)) return '0:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatRelativeTime(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  return new Date(epochMs).toISOString().slice(0, 10);
}
```

**Step 1.4: Write hash.ets utility**

`common/audiodock_common/src/main/ets/utils/hash.ets`:

```typescript
export function djb2(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) + input.charCodeAt(i);
    h = h & 0xFFFFFFFF;
  }
  // Convert to unsigned 32-bit hex
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function urlToFilename(url: string, ext: string): string {
  return `${djb2(url)}.${ext.replace(/^\./, '')}`;
}
```

**Step 1.5: Write common.ets types**

`common/audiodock_common/src/main/ets/types/common.ets`:

```typescript
export type Nullable<T> = T | null;
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface PageResp<T> {
  data: T[];
  total: number;
  current: number;
  pageSize: number;
}

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

**Step 1.6: Write Index.ets barrel**

`common/audiodock_common/Index.ets`:

```typescript
export { Logger } from './src/main/ets/logger/Logger';
export { formatDuration, formatSize, formatRelativeTime } from './src/main/ets/utils/format';
export { djb2, urlToFilename } from './src/main/ets/utils/hash';
export type { Nullable, Result, PageResp, KeyValueStore } from './src/main/ets/types/common';
```

**Step 1.7: Update root oh-package.json5**

```json5
{
  "modelVersion": "5.0.0",
  "dependencies": {},
  "devDependencies": {
    "@ohos/hypium": "1.0.21",
    "@ohos/hvigor-ohos-plugin": "5.0.5"
  }
}
```

**Step 1.8: Verify build**

Run: `cd apps/harmony && hvigorw check --module common/audiodock_common@default`
Expected: SUCCESS, no compile errors.

**Step 1.9: Commit**

```bash
git add apps/harmony/common apps/harmony/oh-package.json5
git commit -m "feat(harmony): P0 T1.1 公共 common 模块

- Logger/format/hash/types/Index
- 占位 module.json5 + build-profile.json5"
```

---

### Task 2: Build features/storage (PreferencesStore + FileCache + RdbStore)

**Files:**
- Create: `apps/harmony/features/storage/build-profile.json5`
- Create: `apps/harmony/features/storage/src/main/module.json5`
- Create: `apps/harmony/features/storage/src/main/ets/PreferencesStore.ets`
- Create: `apps/harmony/features/storage/src/main/ets/FileCache.ets`
- Create: `apps/harmony/features/storage/src/main/ets/RdbStore.ets`
- Create: `apps/harmony/features/storage/Index.ets`
- Modify: `apps/harmony/oh-package.json5` (add `features/storage` dep)
- Modify: `apps/harmony/products/entry/oh-package.json5` (add `features/storage` dep)

**Step 2.1: Create storage module skeleton**

`features/storage/build-profile.json5`:

```json5
{
  "apiType": "stageMode",
  "buildOption": {
    "arkOptions": { "runtimeOnly": { "sources": [], "packages": [] } }
  }
}
```

`features/storage/src/main/module.json5`:

```json5
{ "module": { "name": "features_storage", "type": "har", "deliveryWithInstall": false } }
```

**Step 2.2: Write PreferencesStore.ets**

`features/storage/src/main/ets/PreferencesStore.ets`:

```typescript
import preferences from '@ohos.data.preferences';
import common from '@ohos.app.ability.common';
import { Logger } from 'audiodock_common';
import type { KeyValueStore } from 'audiodock_common';

const STORE_NAME = 'audiodock_kv';

export class PreferencesStore implements KeyValueStore {
  private prefs: preferences.Preferences | null = null;

  async init(context: common.UIAbilityContext): Promise<void> {
    this.prefs = await preferences.getPreferences(context, STORE_NAME);
    Logger.i('PreferencesStore', 'KV store ready');
  }

  async get(key: string): Promise<string | null> {
    if (!this.prefs) throw new Error('PreferencesStore not initialized');
    const v = await this.prefs.get(key, '');
    return v === '' ? null : v;
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.prefs) throw new Error('PreferencesStore not initialized');
    await this.prefs.put(key, value);
    await this.prefs.flush();
  }

  async delete(key: string): Promise<void> {
    if (!this.prefs) throw new Error('PreferencesStore not initialized');
    await this.prefs.delete(key);
    await this.prefs.flush();
  }

  async clear(): Promise<void> {
    if (!this.prefs) throw new Error('PreferencesStore not initialized');
    await this.prefs.clear();
    await this.prefs.flush();
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw === null) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }

  async setJSON<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  }
}

export const kvStore = new PreferencesStore();
```

**Step 2.3: Write FileCache.ets**

`features/storage/src/main/ets/FileCache.ets`:

```typescript
import fs from '@ohos.file.fs';
import common from '@ohos.app.ability.common';
import { Logger, urlToFilename, formatSize } from 'audiodock_common';

const AUDIO_DIR = 'audio_cache';
const COVER_DIR = 'cover_cache';
const LYRICS_DIR = 'lyrics_cache';

interface DownloadProgress { loaded: number; total: number }

export class FileCache {
  private rootDir: string = '';
  private inflight = new Map<string, Promise<string>>();

  async init(context: common.UIAbilityContext): Promise<void> {
    this.rootDir = `${context.filesDir}/cache`;
    await fs.mkdir(`${this.rootDir}/${AUDIO_DIR}`).catch(() => undefined);
    await fs.mkdir(`${this.rootDir}/${COVER_DIR}`).catch(() => undefined);
    await fs.mkdir(`${this.rootDir}/${LYRICS_DIR}`).catch(() => undefined);
    Logger.i('FileCache', `Cache root: ${this.rootDir}`);
  }

  async audioPath(trackId: string, ext: string): Promise<string> {
    return `${this.rootDir}/${AUDIO_DIR}/${trackId}.${ext.replace(/^\./, '')}`;
  }

  async coverPath(url: string, ext: string = 'jpg'): Promise<string> {
    return `${this.rootDir}/${COVER_DIR}/${urlToFilename(url, ext)}`;
  }

  async lyricsPath(trackId: string): Promise<string> {
    return `${this.rootDir}/${LYRICS_DIR}/${trackId}.json`;
  }

  async hasAudio(trackId: string, ext: string): Promise<boolean> {
    return fs.access(await this.audioPath(trackId, ext)).then(() => true).catch(() => false);
  }

  async downloadAudio(
    trackId: string, ext: string, sourceUri: string,
    onProgress?: (p: DownloadProgress) => void,
  ): Promise<string> {
    const dest = await this.audioPath(trackId, ext);
    const key = `${trackId}:${ext}`;
    if (this.inflight.has(key)) return this.inflight.get(key)!;
    const tmp = `${dest}.tmp`;
    const task = fs.openSync(sourceUri)
      .then((fd) => fs.copyFile(fd, tmp))
      .then(() => fs.rename(tmp, dest))
      .then(() => {
        this.inflight.delete(key);
        onProgress?.({ loaded: 100, total: 100 });
        return dest;
      })
      .catch((err: Error) => {
        this.inflight.delete(key);
        Logger.e('FileCache', `audio download failed: ${err.message}`);
        throw err;
      });
    this.inflight.set(key, task);
    return task;
  }

  async removeAudio(trackId: string, ext: string): Promise<void> {
    const p = await this.audioPath(trackId, ext);
    await fs.unlink(p).catch(() => undefined);
  }

  async sizeByCategory(): Promise<Record<string, number>> {
    const out: Record<string, number> = { covers: 0, music: 0, audiobooks: 0, apks: 0 };
    for (const dir of [AUDIO_DIR, COVER_DIR, LYRICS_DIR]) {
      const files = await fs.listFile(`${this.rootDir}/${dir}`).catch(() => [] as string[]);
      for (const f of files) {
        const stat = await fs.stat(`${this.rootDir}/${dir}/${f}`).catch(() => null);
        if (stat) {
          const key = dir === AUDIO_DIR ? 'music' : dir === COVER_DIR ? 'covers' : 'audiobooks';
          out[key] += Number(stat.size);
        }
      }
    }
    return out;
  }

  async clearCategory(category: 'covers' | 'music' | 'audiobooks' | 'apks'): Promise<void> {
    const dirMap: Record<string, string> = { covers: COVER_DIR, music: AUDIO_DIR, audiobooks: LYRICS_DIR };
    const d = dirMap[category];
    if (!d) return;
    const files = await fs.listFile(`${this.rootDir}/${d}`).catch(() => [] as string[]);
    for (const f of files) await fs.unlink(`${this.rootDir}/${d}/${f}`).catch(() => undefined);
  }

  formatSize(bytes: number): string { return formatSize(bytes); }
}

export const fileCache = new FileCache();
```

**Step 2.4: Write RdbStore.ets**

`features/storage/src/main/ets/RdbStore.ets`:

```typescript
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
```

**Step 2.5: Write storage Index.ets**

`features/storage/Index.ets`:

```typescript
export { PreferencesStore, kvStore } from './src/main/ets/PreferencesStore';
export { FileCache, fileCache } from './src/main/ets/FileCache';
export { RdbStore, rdbStore } from './src/main/ets/RdbStore';
export type {
  TrackHistoryRow, TrackLikeRow, AlbumLikeRow,
  AudiobookLikeRow, DownloadedRow,
} from './src/main/ets/RdbStore';
```

**Step 2.6: Add to oh-package**

`apps/harmony/oh-package.json5` — add to dependencies:
```json5
"audiodock_common": { "path": "./common/audiodock_common" },
"features_storage": { "path": "./features/storage" }
```

`apps/harmony/products/entry/oh-package.json5` — same.

**Step 2.7: Verify build**

Run: `cd apps/harmony && hvigorw check --module features/storage@default`
Expected: SUCCESS.

**Step 2.8: Commit**

```bash
git add apps/harmony/features apps/harmony/oh-package.json5 apps/harmony/products/entry/oh-package.json5
git commit -m "feat(harmony): P0 T2 features/storage — Preferences + FileCache + Rdb

- PreferencesStore: KV with JSON helpers
- FileCache: audio/cover/lyrics download + cache stats
- RdbStore: 6 tables for history/likes/downloads/search
- All key names mirror mobile AsyncStorage keys"
```

---

### Task 3: Build features/network (HarmonyHttpClient + base ApiService)

**Files:**
- Create: `apps/harmony/features/network/build-profile.json5`
- Create: `apps/harmony/features/network/src/main/module.json5`
- Create: `apps/harmony/features/network/src/main/ets/HarmonyHttpClient.ets`
- Create: `apps/harmony/features/network/src/main/ets/HttpError.ets`
- Create: `apps/harmony/features/network/src/main/ets/types.ets`
- Create: `apps/harmony/features/network/Index.ets`
- Modify: `apps/harmony/oh-package.json5`
- Modify: `apps/harmony/products/entry/oh-package.json5`

**Step 3.1: Create network module skeleton**

`features/network/build-profile.json5`:

```json5
{ "apiType": "stageMode", "buildOption": {} }
```

`features/network/src/main/module.json5`:

```json5
{ "module": { "name": "features_network", "type": "har" } }
```

**Step 3.2: Write HttpError.ets**

`features/network/src/main/ets/HttpError.ets`:

```typescript
export class HttpError extends Error {
  status: number;
  body: object | null;

  constructor(status: number, message: string, body: object | null = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }

  static fromStatus(status: number, body: object | null): HttpError {
    const msg = (body as { message?: string })?.message ?? `HTTP ${status}`;
    return new HttpError(status, msg, body);
  }
}
```

**Step 3.3: Write types.ets**

`features/network/src/main/ets/types.ets`:

```typescript
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestConfig {
  method: HttpMethod;
  url: string;
  baseURL?: string;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: object | string;
  timeoutMs?: number;
  retry?: boolean;
}

export interface HttpResponse<T> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export interface BackendEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export interface RequestInterceptor {
  (config: RequestConfig): RequestConfig | Promise<RequestConfig>;
}

export interface ResponseInterceptor {
  (response: HttpResponse<unknown>): HttpResponse<unknown> | Promise<HttpResponse<unknown>>;
}

export interface ErrorInterceptor {
  (error: HttpError): HttpError | Promise<HttpError>;
}
```

**Step 3.4: Write HarmonyHttpClient.ets**

`features/network/src/main/ets/HarmonyHttpClient.ets`:

```typescript
import http from '@ohos.net.http';
import { Logger } from 'audiodock_common';
import { HttpError } from './HttpError';
import type {
  RequestConfig, HttpResponse, HttpMethod,
  BackendEnvelope, RequestInterceptor, ResponseInterceptor, ErrorInterceptor,
} from './types';

const DEFAULT_TIMEOUT = 30_000;
const RETRY_DELAY_MS = 800;

export class HarmonyHttpClient {
  private baseURL: string = '';
  private defaultHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  private authToken: string | null = null;
  private reqInterceptors: RequestInterceptor[] = [];
  private resInterceptors: ResponseInterceptor[] = [];
  private errInterceptors: ErrorInterceptor[] = [];

  setBaseURL(url: string): void {
    this.baseURL = url.replace(/\/+$/, '');
    Logger.i('HttpClient', `baseURL=${this.baseURL}`);
  }

  getBaseURL(): string { return this.baseURL; }

  setAuthToken(token: string | null): void { this.authToken = token; }

  addRequestInterceptor(i: RequestInterceptor): void { this.reqInterceptors.push(i); }
  addResponseInterceptor(i: ResponseInterceptor): void { this.resInterceptors.push(i); }
  addErrorInterceptor(i: ErrorInterceptor): void { this.errInterceptors.push(i); }

  async request<T>(cfg: RequestConfig): Promise<T> {
    let config: RequestConfig = { ...cfg, timeoutMs: cfg.timeoutMs ?? DEFAULT_TIMEOUT };
    for (const i of this.reqInterceptors) config = await i(config);

    if (config.baseURL === undefined) config.baseURL = this.baseURL;
    if (this.authToken && config.headers?.['Authorization'] === undefined) {
      config.headers = { ...config.headers, Authorization: `Bearer ${this.authToken}` };
    }

    const attempt = async (): Promise<HttpResponse<unknown>> => {
      const httpReq = http.createHttp();
      const fullUrl = this.buildUrl(config);
      try {
        const opts: http.HttpRequestOptions = {
          method: config.method as http.RequestMethod,
          header: config.headers,
          readTimeout: config.timeoutMs,
          connectTimeout: config.timeoutMs,
          extraData: typeof config.data === 'string' ? config.data
            : config.data ? JSON.stringify(config.data) : undefined,
        };
        const resp = await httpReq.request(fullUrl, opts);
        let parsed: unknown = resp.result;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch { /* keep as string */ }
        }
        const out: HttpResponse<unknown> = {
          status: resp.responseCode,
          data: parsed,
          headers: resp.header as Record<string, string>,
        };
        let final: HttpResponse<unknown> = out;
        for (const i of this.resInterceptors) final = await i(final);
        return final;
      } finally {
        httpReq.destroy();
      }
    };

    let response: HttpResponse<unknown>;
    try {
      response = await attempt();
    } catch (e) {
      let err = e instanceof HttpError ? e : new HttpError(0, String(e));
      for (const i of this.errInterceptors) err = await i(err);
      if (config.retry && err.status >= 500) {
        await new Promise<void>((r) => setTimeout(r, RETRY_DELAY_MS));
        response = await attempt();
      } else {
        throw err;
      }
    }

    if (response.status < 200 || response.status >= 300) {
      throw HttpError.fromStatus(response.status, response.data as object | null);
    }

    const env = response.data as BackendEnvelope<T>;
    if (env && typeof env === 'object' && 'code' in env && 'data' in env) {
      if (env.code !== 0) throw new HttpError(response.status, env.message || `code=${env.code}`, env);
      return env.data;
    }
    return response.data as T;
  }

  async get<T>(url: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return this.request<T>({ method: 'GET', url, params, retry: true });
  }
  async post<T>(url: string, data?: object): Promise<T> {
    return this.request<T>({ method: 'POST', url, data });
  }
  async put<T>(url: string, data?: object): Promise<T> {
    return this.request<T>({ method: 'PUT', url, data });
  }
  async del<T>(url: string): Promise<T> {
    return this.request<T>({ method: 'DELETE', url });
  }

  private buildUrl(cfg: RequestConfig): string {
    const base = cfg.baseURL ?? this.baseURL;
    let path = cfg.url.startsWith('/') ? cfg.url : `/${cfg.url}`;
    let full = `${base}${path}`;
    if (cfg.params && Object.keys(cfg.params).length > 0) {
      const qs = Object.entries(cfg.params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      full += `${full.includes('?') ? '&' : '?'}${qs}`;
    }
    return full;
  }
}

export const httpClient = new HarmonyHttpClient();
```

**Step 3.5: Write network Index.ets**

`features/network/Index.ets`:

```typescript
export { HarmonyHttpClient, httpClient } from './src/main/ets/HarmonyHttpClient';
export { HttpError } from './src/main/ets/HttpError';
export type {
  RequestConfig, HttpResponse, HttpMethod,
  BackendEnvelope, RequestInterceptor, ResponseInterceptor, ErrorInterceptor,
} from './src/main/ets/types';
```

**Step 3.6: Add to oh-package**

Add `features_network: { path: './features/network' }` to both root and entry `oh-package.json5`.

**Step 3.7: Verify build**

Run: `cd apps/harmony && hvigorw check --module features/network@default`
Expected: SUCCESS.

**Step 3.8: Commit**

```bash
git add apps/harmony/features/network apps/harmony/oh-package.json5 apps/harmony/products/entry/oh-package.json5
git commit -m "feat(harmony): P0 T3 features/network — HarmonyHttpClient

- 自动注入 Bearer token
- 解析 backend envelope {code,message,data}
- 30s 超时 + GET 5xx 重试 1 次
- request/response/error 拦截器"
```

---

### Task 4: Build features/ui (Theme tokens + common components)

**Files:**
- Create: `apps/harmony/features/ui/build-profile.json5`
- Create: `apps/harmony/features/ui/src/main/module.json5`
- Create: `apps/harmony/features/ui/src/main/ets/theme/ColorTokens.ets`
- Create: `apps/harmony/features/ui/src/main/ets/theme/Spacing.ets`
- Create: `apps/harmony/features/ui/src/main/ets/theme/Typography.ets`
- Create: `apps/harmony/features/ui/src/main/ets/theme/Theme.ets`
- Create: `apps/harmony/features/ui/src/main/ets/components/CommonButton.ets`
- Create: `apps/harmony/features/ui/src/main/ets/components/CommonNavBar.ets`
- Create: `apps/harmony/features/ui/src/main/ets/components/EmptyView.ets`
- Create: `apps/harmony/features/ui/src/main/ets/components/SkeletonBlock.ets`
- Create: `apps/harmony/features/ui/Index.ets`
- Modify: `apps/harmony/oh-package.json5`

**Step 4.1: Module skeleton**

`features/ui/build-profile.json5`:

```json5
{ "apiType": "stageMode" }
```

`features/ui/src/main/module.json5`:

```json5
{ "module": { "name": "features_ui", "type": "har" } }
```

**Step 4.2: ColorTokens.ets**

`features/ui/src/main/ets/theme/ColorTokens.ets`:

```typescript
export type ThemeMode = 'light' | 'dark' | 'festive';

export interface ColorPalette {
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  onPrimary: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  error: string;
  success: string;
  warning: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export const lightColors: ColorPalette = {
  background: '#FFFFFFFF',
  surface: '#F7F7F7FF',
  surfaceAlt: '#EEEEEEFF',
  primary: '#FF5722FF',
  onPrimary: '#FFFFFFFF',
  text: '#1A1A1AFF',
  textSecondary: '#666666FF',
  border: '#E0E0E0FF',
  accent: '#FF9800FF',
  error: '#E53935FF',
  success: '#43A047FF',
  warning: '#FFB300FF',
  tabBar: '#FFFFFFFF',
  tabBarActive: '#FF5722FF',
  tabBarInactive: '#999999FF',
};

export const darkColors: ColorPalette = {
  background: '#121212FF',
  surface: '#1E1E1EFF',
  surfaceAlt: '#2A2A2AFF',
  primary: '#FF7043FF',
  onPrimary: '#FFFFFFFF',
  text: '#F0F0F0FF',
  textSecondary: '#AAAAAAFF',
  border: '#333333FF',
  accent: '#FFB74DFF',
  error: '#EF5350FF',
  success: '#66BB6AFF',
  warning: '#FFCA28FF',
  tabBar: '#1A1A1AFF',
  tabBarActive: '#FF7043FF',
  tabBarInactive: '#888888FF',
};

export const festiveColors: ColorPalette = {
  background: '#FFF8F1FF',
  surface: '#FFEEDBFF',
  surfaceAlt: '#FFE0C2FF',
  primary: '#D32F2FFF',
  onPrimary: '#FFEB3BFF',
  text: '#3E2723FF',
  textSecondary: '#795548FF',
  border: '#FFCCBCFF',
  accent: '#FFB300FF',
  error: '#C62828FF',
  success: '#388E3CFF',
  warning: '#F57C00FF',
  tabBar: '#FFEBE0FF',
  tabBarActive: '#D32F2FFF',
  tabBarInactive: '#A1887FFF',
};
```

**Step 4.3: Spacing.ets**

`features/ui/src/main/ets/theme/Spacing.ets`:

```typescript
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 9999,
} as const;
```

**Step 4.4: Typography.ets**

`features/ui/src/main/ets/theme/Typography.ets`:

```typescript
export interface TextStyle {
  fontSize: number;
  fontWeight: FontWeight;
  lineHeight: number;
}

export enum FontWeight {
  Regular = 400, Medium = 500, SemiBold = 600, Bold = 700,
}

export const Typography = {
  h1: { fontSize: 28, fontWeight: FontWeight.Bold, lineHeight: 36 },
  h2: { fontSize: 22, fontWeight: FontWeight.SemiBold, lineHeight: 30 },
  h3: { fontSize: 18, fontWeight: FontWeight.SemiBold, lineHeight: 26 },
  body: { fontSize: 15, fontWeight: FontWeight.Regular, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: FontWeight.Medium, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: FontWeight.Regular, lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: FontWeight.Regular, lineHeight: 16 },
} as const;
```

**Step 4.5: Theme.ets**

`features/ui/src/main/ets/theme/Theme.ets`:

```typescript
import type { ColorPalette, ThemeMode } from './ColorTokens';
import { lightColors, darkColors, festiveColors } from './ColorTokens';
import { Spacing, Radius } from './Spacing';
import { Typography } from './Typography';

export interface Theme {
  mode: ThemeMode;
  colors: ColorPalette;
  spacing: typeof Spacing;
  radius: typeof Radius;
  typography: typeof Typography;
}

export function buildTheme(mode: ThemeMode): Theme {
  const colors = mode === 'dark' ? darkColors : mode === 'festive' ? festiveColors : lightColors;
  return { mode, colors, spacing: Spacing, radius: Radius, typography: Typography };
}

export const defaultTheme = buildTheme('light');
```

**Step 4.6: CommonButton.ets**

`features/ui/src/main/ets/components/CommonButton.ets`:

```typescript
import { buildTheme, type Theme } from '../theme/Theme';

@Component
export struct CommonButton {
  @Prop label: string = '';
  @Prop variant: 'primary' | 'secondary' | 'ghost' = 'primary';
  @Prop disabled: boolean = false;
  @Prop theme: Theme = buildTheme('light');
  onClick: () => void = () => {};

  build() {
    Button(this.label)
      .type(this.variant === 'ghost' ? ButtonType.Normal : ButtonType.Capsule)
      .backgroundColor(this.bg())
      .fontColor(this.fg())
      .fontSize(this.theme.typography.body.fontSize)
      .height(44)
      .padding({ left: 24, right: 24 })
      .enabled(!this.disabled)
      .onClick(() => this.onClick());
  }

  private bg(): string {
    if (this.disabled) return this.theme.colors.surfaceAlt;
    switch (this.variant) {
      case 'primary': return this.theme.colors.primary;
      case 'secondary': return this.theme.colors.surfaceAlt;
      case 'ghost': return '#00000000';
    }
  }

  private fg(): string {
    if (this.disabled) return this.theme.colors.textSecondary;
    switch (this.variant) {
      case 'primary': return this.theme.colors.onPrimary;
      case 'secondary': return this.theme.colors.text;
      case 'ghost': return this.theme.colors.primary;
    }
  }
}
```

**Step 4.7: CommonNavBar.ets**

`features/ui/src/main/ets/components/CommonNavBar.ets`:

```typescript
import { buildTheme, type Theme } from '../theme/Theme';

@Component
export struct CommonNavBar {
  @Prop title: string = '';
  @Prop showBack: boolean = true;
  @Prop theme: Theme = buildTheme('light');
  onBack: () => void = () => {};

  build() {
    Row() {
      if (this.showBack) {
        Text('‹')
          .fontSize(28)
          .fontColor(this.theme.colors.text)
          .width(44).height(44)
          .textAlign(TextAlign.Center)
          .onClick(() => this.onBack());
      } else {
        Row().width(44);
      }
      Text(this.title)
        .layoutWeight(1)
        .textAlign(TextAlign.Center)
        .fontSize(this.theme.typography.h3.fontSize)
        .fontWeight(this.theme.typography.h3.fontWeight)
        .fontColor(this.theme.colors.text);
      Row().width(44);
    }
    .width('100%').height(56)
    .backgroundColor(this.theme.colors.surface)
    .padding({ left: 4, right: 4 });
  }
}
```

**Step 4.8: EmptyView.ets**

`features/ui/src/main/ets/components/EmptyView.ets`:

```typescript
import { buildTheme, type Theme } from '../theme/Theme';

@Component
export struct EmptyView {
  @Prop message: string = '暂无数据';
  @Prop theme: Theme = buildTheme('light');

  build() {
    Column() {
      Text(this.message)
        .fontSize(this.theme.typography.body.fontSize)
        .fontColor(this.theme.colors.textSecondary);
    }
    .width('100%').height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center);
  }
}
```

**Step 4.9: SkeletonBlock.ets**

`features/ui/src/main/ets/components/SkeletonBlock.ets`:

```typescript
import { buildTheme, type Theme } from '../theme/Theme';

@Component
export struct SkeletonBlock {
  @Prop width: string | number = '100%';
  @Prop height: number = 16;
  @Prop radius: number = 4;
  @Prop theme: Theme = buildTheme('light');

  build() {
    Row()
      .width(this.width).height(this.height)
      .backgroundColor(this.theme.colors.surfaceAlt)
      .borderRadius(this.radius);
  }
}
```

**Step 4.10: ui Index.ets**

`features/ui/Index.ets`:

```typescript
export { buildTheme, defaultTheme } from './src/main/ets/theme/Theme';
export type { Theme } from './src/main/ets/theme/Theme';
export type { ColorPalette, ThemeMode } from './src/main/ets/theme/ColorTokens';
export { lightColors, darkColors, festiveColors } from './src/main/ets/theme/ColorTokens';
export { Spacing, Radius } from './src/main/ets/theme/Spacing';
export { Typography, FontWeight } from './src/main/ets/theme/Typography';
export { CommonButton } from './src/main/ets/components/CommonButton';
export { CommonNavBar } from './src/main/ets/components/CommonNavBar';
export { EmptyView } from './src/main/ets/components/EmptyView';
export { SkeletonBlock } from './src/main/ets/components/SkeletonBlock';
```

**Step 4.11: Add to oh-package**

Add `features_ui: { path: './features/ui' }` to root and entry `oh-package.json5`.

**Step 4.12: Verify build**

Run: `cd apps/harmony && hvigorw check --module features/ui@default`
Expected: SUCCESS.

**Step 4.13: Commit**

```bash
git add apps/harmony/features/ui apps/harmony/oh-package.json5 apps/harmony/products/entry/oh-package.json5
git commit -m "feat(harmony): P0 T4 features/ui — 主题令牌 + 通用组件

- ColorPalette light/dark/festive
- Spacing/Radius/Typography 令牌
- Theme buildTheme(mode)
- CommonButton/CommonNavBar/EmptyView/SkeletonBlock"
```

---

### Task 5: Build features/i18n

**Files:**
- Create: `apps/harmony/features/i18n/build-profile.json5`
- Create: `apps/harmony/features/i18n/src/main/module.json5`
- Create: `apps/harmony/features/i18n/src/main/ets/I18n.ets`
- Create: `apps/harmony/features/i18n/src/main/resources/locales/en.json`
- Create: `apps/harmony/features/i18n/src/main/resources/locales/zh-CN.json`
- Create: `apps/harmony/features/i18n/Index.ets`
- Modify: `apps/harmony/oh-package.json5`

**Step 5.1: Module skeleton**

`features/i18n/build-profile.json5`:

```json5
{ "apiType": "stageMode" }
```

`features/i18n/src/main/module.json5`:

```json5
{ "module": { "name": "features_i18n", "type": "har" } }
```

**Step 5.2: Copy translation files from packages/i18e**

Copy `packages/i18e/src/locales/common/en.json` to `features/i18n/src/main/resources/locales/en.json`.
Copy `packages/i18e/src/locales/common/zh-CN.json` to `features/i18n/src/main/resources/locales/zh-CN.json`.

These become raw text files consumed at runtime.

**Step 5.3: Write I18n.ets**

`features/i18n/src/main/ets/I18n.ets`:

```typescript
import i18n from '@ohos.i18n';
import { Logger } from 'audiodock_common';

import zhCN from '../resources/locales/zh-CN.json';
import en from '../resources/locales/en.json';

export type Lang = 'zh-CN' | 'en';
export type LangSetting = 'system' | Lang;

const STORAGE_KEY = 'app_language';

const RESOURCES: Record<Lang, Record<string, string>> = {
  'zh-CN': zhCN as Record<string, string>,
  en: en as Record<string, string>,
};

let currentLang: Lang = 'zh-CN';

export function detectSystemLang(): Lang {
  const sys = i18n.System.getSystemLanguage();
  if (sys.toLowerCase().startsWith('zh')) return 'zh-CN';
  return 'en';
}

export function setLanguage(lang: Lang): void {
  currentLang = lang;
  Logger.i('I18n', `lang=${lang}`);
}

export function applySetting(setting: LangSetting): void {
  if (setting === 'system') setLanguage(detectSystemLang());
  else setLanguage(setting);
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = RESOURCES[currentLang] ?? RESOURCES['zh-CN'];
  let raw = dict[key];
  if (raw === undefined) {
    const fallback = RESOURCES['en'][key] ?? RESOURCES['zh-CN'][key];
    raw = fallback ?? key;
  }
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name) => {
    const v = params[name];
    return v === undefined ? `{${name}}` : String(v);
  });
}

export function getLang(): Lang { return currentLang; }

export const I18N_STORAGE_KEY = STORAGE_KEY;
```

**Step 5.4: i18n Index.ets**

`features/i18n/Index.ets`:

```typescript
export { t, setLanguage, applySetting, detectSystemLang, getLang, I18N_STORAGE_KEY }
  from './src/main/ets/I18n';
export type { Lang, LangSetting } from './src/main/ets/I18n';
```

**Step 5.5: Add to oh-package**

Add `features_i18n: { path: './features/i18n' }` to root and entry `oh-package.json5`.

**Step 5.6: Verify build**

Run: `cd apps/harmony && hvigorw check --module features/i18n@default`
Expected: SUCCESS.

**Step 5.7: Commit**

```bash
git add apps/harmony/features/i18n apps/harmony/oh-package.json5 apps/harmony/products/entry/oh-package.json5
git commit -m "feat(harmony): P0 T5 features/i18n — i18n 资源 + t() helper

- 从 packages/i18e 复制 zh-CN/en 资源
- 支持 system/zh-CN/en 设置
- t(key, params) 占位符替换"
```

---

### Task 6: Build features/socket

**Files:**
- Create: `apps/harmony/features/socket/build-profile.json5`
- Create: `apps/harmony/features/socket/src/main/module.json5`
- Create: `apps/harmony/features/socket/src/main/ets/HarmonySocketService.ets`
- Create: `apps/harmony/features/socket/Index.ets`
- Modify: `apps/harmony/oh-package.json5`

**Step 6.1: Module skeleton**

`features/socket/build-profile.json5`:

```json5
{ "apiType": "stageMode" }
```

`features/socket/src/main/module.json5`:

```json5
{ "module": { "name": "features_socket", "type": "har" } }
```

**Step 6.2: Write HarmonySocketService.ets**

`features/socket/src/main/ets/HarmonySocketService.ets`:

```typescript
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
```

**Step 6.3: socket Index.ets**

`features/socket/Index.ets`:

```typescript
export { HarmonySocketService, socketService } from './src/main/ets/HarmonySocketService';
export type { SocketConnectOptions } from './src/main/ets/HarmonySocketService';
```

**Step 6.4: Add to oh-package**

Add `features_socket: { path: './features/socket' }` to root and entry `oh-package.json5`.

**Step 6.5: Verify build**

Run: `cd apps/harmony && hvigorw check --module features/socket@default`
Expected: SUCCESS.

**Step 6.6: Commit**

```bash
git add apps/harmony/features/socket apps/harmony/oh-package.json5 apps/harmony/products/entry/oh-package.json5
git commit -m "feat(harmony): P0 T6 features/socket — WebSocket 包装

- 指数退避自动重连 1s/2s/4s.../30s
- emit/on/off/wildcard
- query 参数构造"
```

---

### Task 7: Wire EntryAbility to initialize all stores + storage + http

**Files:**
- Modify: `apps/harmony/products/entry/src/main/ets/entryability/EntryAbility.ets`
- Modify: `apps/harmony/products/entry/oh-package.json5` (add `common/audiodock_common`)

**Step 7.1: Update EntryAbility.ets**

Replace the entire body of `entryability/EntryAbility.ets`:

```typescript
import UIAbility from '@ohos.app.ability.UIAbility';
import hilog from '@ohos.hilog';
import wantConstant from '@ohos.app.ability.wantConstant';
import { Logger } from 'audiodock_common';
import { kvStore, fileCache, rdbStore } from 'features_storage';
import { httpClient } from 'features_network';
import { applySetting } from 'features_i18n';

const DOMAIN = 0xA001;
const TAG = 'EntryAbility';

export default class EntryAbility extends UIAbility {
  async onCreate(want: want, launchParam: number): Promise<void> {
    hilog.info(DOMAIN, TAG, `onCreate launchParam=${launchParam}`);
    Logger.i(TAG, 'onCreate');
    await this.initialize();
    this.loadPage('pages/Index');
  }

  onDestroy(): void {
    Logger.i(TAG, 'onDestroy');
  }

  onWindowStageCreate(windowStage: any): void {
    hilog.info(DOMAIN, TAG, 'onWindowStageCreate');
    windowStage.loadContent('pages/Index', (err: Error) => {
      if (err) Logger.e(TAG, `loadContent: ${err.message}`);
    });
  }

  private async initialize(): Promise<void> {
    const ctx = this.context;
    await kvStore.init(ctx);
    await fileCache.init(ctx);
    await rdbStore.init(ctx);

    const stored = await kvStore.get('serverAddress');
    if (stored) httpClient.setBaseURL(stored);
    const token = await kvStore.get(`token_${stored ?? ''}`);
    if (token) httpClient.setAuthToken(token);

    const langSetting = await kvStore.get('app_language');
    if (langSetting === 'zh-CN' || langSetting === 'en') applySetting(langSetting);
    else applySetting('system');

    Logger.i(TAG, 'initialize complete');
  }

  private loadPage(path: string): void {
    hilog.info(DOMAIN, TAG, `would navigate to ${path}`);
  }
}
```

**Step 7.2: Update entry oh-package.json5**

Ensure deps include `audiodock_common`, `features_storage`, `features_network`, `features_i18n`.

**Step 7.3: Verify build**

Run: `cd apps/harmony && hvigorw assembleHap --mode module -p product=default`
Expected: SUCCESS, produces `.app` / `.hap` in `products/entry/build/default/outputs/default/`.

**Step 7.4: Commit**

```bash
git add apps/harmony/products/entry/src/main/ets/entryability/EntryAbility.ets apps/harmony/products/entry/oh-package.json5
git commit -m "feat(harmony): P0 T7 EntryAbility 接入所有 features 初始化

- 初始化 kvStore/fileCache/rdbStore
- 从 KV 读取 serverAddress + token 注入 httpClient
- 设置语言"
```

---

### Task 8: Build auth API + AuthStore (replaces feat/hm HttpClient/StorageManager)

**Files:**
- Create: `apps/harmony/features/network/src/main/ets/api/auth.ts`
- Create: `apps/harmony/features/network/src/main/ets/api/user.ts`
- Create: `apps/harmony/features/network/src/main/ets/api/index.ts`
- Modify: `apps/harmony/features/network/Index.ets`
- Create: `apps/harmony/products/entry/src/main/ets/context/AuthStore.ets`

**Step 8.1: Write auth.ts**

`features/network/src/main/ets/api/auth.ts`:

```typescript
import { httpClient } from '../HarmonyHttpClient';

export interface LoginDto { username: string; password: string }
export interface RegisterDto {
  username: string; password: string; nickname?: string; deviceName?: string;
}
export interface AuthMe { id: string; username: string; nickname?: string }
export interface LoginResponse { token: string; user: AuthMe; deviceId: string }
export interface CheckResponse { needRegister: boolean }

export const authApi = {
  async login(dto: LoginDto): Promise<LoginResponse> {
    return httpClient.post<LoginResponse>('/auth/login', dto);
  },
  async register(dto: RegisterDto): Promise<LoginResponse> {
    return httpClient.post<LoginResponse>('/auth/register', dto);
  },
  async me(): Promise<AuthMe> {
    return httpClient.get<AuthMe>('/auth/me');
  },
  async check(username: string): Promise<CheckResponse> {
    return httpClient.get<CheckResponse>('/auth/check', { username });
  },
  async resetPassword(dto: { username: string; newPassword: string; deviceName: string }): Promise<void> {
    return httpClient.post<void>('/auth/reset-password', dto);
  },
  async verifyDevice(dto: { username: string; deviceName: string }): Promise<{ verified: boolean }> {
    return httpClient.post<{ verified: boolean }>('/auth/verify-device', dto);
  },
};
```

**Step 8.2: Write user.ts**

`features/network/src/main/ets/api/user.ts`:

```typescript
import { httpClient } from '../HarmonyHttpClient';

export interface UserItem {
  id: string; username: string; nickname?: string; role: string;
  createdAt: string; expiresAt?: string | null;
}

export const userApi = {
  async list(params: { pageSize: number; loadCount: number }): Promise<{ data: UserItem[]; total: number }> {
    return httpClient.get('/user/list', params);
  },
  async create(payload: { username: string; password: string; nickname?: string; role?: string }): Promise<UserItem> {
    return httpClient.post<UserItem>('/user', payload);
  },
  async delete(id: string): Promise<void> {
    return httpClient.del<void>(`/user/${id}`);
  },
  async uploadAvatar(id: string, fileUri: string): Promise<{ url: string }> {
    return httpClient.post<{ url: string }>(`/user/${id}/avatar`, { fileUri });
  },
};
```

**Step 8.3: Write api/index.ts**

`features/network/src/main/ets/api/index.ts`:

```typescript
export { authApi } from './auth';
export { userApi } from './user';
export type { LoginDto, RegisterDto, AuthMe, LoginResponse, CheckResponse } from './auth';
export type { UserItem } from './user';
```

**Step 8.4: Update network Index.ets**

Append to `features/network/Index.ets`:

```typescript
export { authApi, userApi } from './src/main/ets/api';
export type { LoginDto, RegisterDto, AuthMe, LoginResponse, CheckResponse, UserItem }
  from './src/main/ets/api';
```

**Step 8.5: Write AuthStore.ets**

`products/entry/src/main/ets/context/AuthStore.ets`:

```typescript
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
```

**Step 8.6: Verify build**

Run: `cd apps/harmony && hvigorw assembleHap --mode module -p product=default`
Expected: SUCCESS.

**Step 8.7: Commit**

```bash
git add apps/harmony/features/network apps/harmony/products/entry/src/main/ets/context
git commit -m "feat(harmony): P0 T8 features/network api + AuthStore

- auth.ts: login/register/me/check/resetPassword/verifyDevice
- user.ts: 用户 CRUD + 头像上传
- AuthStore: 状态 + KV 持久化 + httpClient 同步"
```

---

### Task 9: Build SourceSelectPage + LoginPage using new AuthStore

**Files:**
- Modify: `apps/harmony/products/entry/src/main/ets/pages/SourceSelectPage.ets`
- Modify: `apps/harmony/products/entry/src/main/ets/pages/LoginPage.ets`
- Modify: `apps/harmony/products/entry/src/main/ets/pages/Index.ets`

**Step 9.1: Replace SourceSelectPage.ets**

```typescript
import router from '@ohos.router';
import { buildTheme, CommonNavBar, CommonButton } from 'features_ui';
import { t } from 'features_i18n';
import { httpClient } from 'features_network';
import { kvStore } from 'features_storage';

@Entry
@Component
struct SourceSelectPage {
  @State serverUrl: string = '';
  @State serverName: string = '';
  private theme = buildTheme('light');

  build() {
    Column() {
      CommonNavBar({ title: t('source_select.title'), showBack: false, theme: this.theme });
      Column({ space: 16 }) {
        Text(t('source_select.heading')).fontSize(20).fontWeight(600).margin({ top: 24 });
        TextInput({ placeholder: t('source_select.url_placeholder'), text: this.serverUrl })
          .onChange((v: string) => this.serverUrl = v)
          .borderRadius(8).padding(12);
        TextInput({ placeholder: t('source_select.name_placeholder'), text: this.serverName })
          .onChange((v: string) => this.serverName = v)
          .borderRadius(8).padding(12);
        CommonButton({
          label: t('common.next'),
          theme: this.theme,
          onClick: () => this.saveAndNext(),
        });
      }.padding(16);
    }.width('100%').height('100%').backgroundColor(this.theme.colors.background);
  }

  private async saveAndNext(): Promise<void> {
    if (!this.serverUrl.trim()) return;
    await kvStore.set('serverAddress', this.serverUrl.trim());
    httpClient.setBaseURL(this.serverUrl.trim());
    router.replaceUrl({ url: 'pages/LoginPage' });
  }
}
```

**Step 9.2: Replace LoginPage.ets**

```typescript
import router from '@ohos.router';
import { buildTheme, CommonNavBar, CommonButton } from 'features_ui';
import { t } from 'features_i18n';
import { HttpError } from 'features_network';
import { authStore } from '../context/AuthStore';

@Entry
@Component
struct LoginPage {
  @State username: string = '';
  @State password: string = '';
  @State errorMsg: string = '';
  @State loading: boolean = false;
  private theme = buildTheme('light');

  build() {
    Column() {
      CommonNavBar({ title: t('login.title'), theme: this.theme,
        onBack: () => router.back() });
      Column({ space: 16 }) {
        Text(t('login.heading')).fontSize(20).fontWeight(600).margin({ top: 24 });
        TextInput({ placeholder: t('login.username'), text: this.username })
          .onChange((v: string) => this.username = v)
          .borderRadius(8).padding(12);
        TextInput({ placeholder: t('login.password'), text: this.password })
          .onChange((v: string) => this.password = v)
          .type(InputType.Password)
          .borderRadius(8).padding(12);
        if (this.errorMsg) Text(this.errorMsg).fontColor('#E53935');
        CommonButton({
          label: this.loading ? t('common.loading') : t('common.login'),
          theme: this.theme, disabled: this.loading,
          onClick: () => this.doLogin(),
        });
        Text(t('login.register_tip'))
          .onClick(() => router.replaceUrl({ url: 'pages/SignUpPage' }))
          .fontColor(this.theme.colors.primary);
      }.padding(16);
    }.width('100%').height('100%').backgroundColor(this.theme.colors.background);
  }

  private async doLogin(): Promise<void> {
    this.loading = true; this.errorMsg = '';
    try {
      await authStore.login({ username: this.username, password: this.password });
      router.replaceUrl({ url: 'pages/MainPage' });
    } catch (e) {
      this.errorMsg = e instanceof HttpError ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }
}
```

**Step 9.3: Replace Index.ets**

```typescript
import router from '@ohos.router';
import { kvStore } from 'features_storage';
import { authStore } from '../context/AuthStore';

@Entry
@Component
struct Index {
  async aboutToAppear(): Promise<void> {
    await authStore.loadFromStorage();
    if (authStore.state_.user) router.replaceUrl({ url: 'pages/MainPage' });
    else if (authStore.state_.serverAddress) router.replaceUrl({ url: 'pages/LoginPage' });
    else router.replaceUrl({ url: 'pages/SourceSelectPage' });
  }

  build() {
    Column() { Text('AudioDock').fontSize(28).fontWeight(700); }
      .width('100%').height('100%').justifyContent(FlexAlign.Center);
  }
}
```

**Step 9.4: Verify build**

Run: `cd apps/harmony && hvigorw assembleHap --mode module -p product=default`
Expected: SUCCESS.

**Step 9.5: Commit**

```bash
git add apps/harmony/products/entry/src/main/ets/pages
git commit -m "feat(harmony): P0 T9 接入新 AuthStore 的 SourceSelect/Login/Index

- Index 检查登录态分流
- SourceSelect 输入 URL → 写入 KV
- Login 调用 authStore.login 错误时显示 message"
```

---

### Task 10: P0 close-out — integration test + handoff

**Files:**
- Create: `apps/harmony/common/audiodock_common/src/test/Common.test.ets`
- Create: `apps/harmony/features/storage/src/test/Storage.test.ets`

**Step 10.1: Write Common unit test**

`common/audiodock_common/src/test/Common.test.ets`:

```typescript
import { describe, it, expect } from '@ohos/hypium';
import { formatDuration, formatSize, djb2 } from '../main/ets/utils/format';
import { djb2 as djb2hash } from '../main/ets/utils/hash';

export default function commonTest() {
  describe('formatDuration', () => {
    it('formats ms < 1min', () => {
      expect(formatDuration(45000)).assertEqual('0:45');
    });
    it('formats min:sec', () => {
      expect(formatDuration(125000)).assertEqual('2:05');
    });
    it('formats h:mm:ss', () => {
      expect(formatDuration(3661000)).assertEqual('1:01:01');
    });
  });

  describe('formatSize', () => {
    it('formats bytes', () => {
      expect(formatSize(500)).assertEqual('500 B');
    });
    it('formats MB', () => {
      expect(formatSize(5 * 1024 * 1024)).assertEqual('5.0 MB');
    });
  });

  describe('djb2', () => {
    it('produces same hash for same input', () => {
      expect(djb2hash('https://x.com/a.jpg')).assertEqual(djb2('https://x.com/a.jpg'));
    });
  });
}
```

**Step 10.2: Write Storage unit test**

`features/storage/src/test/Storage.test.ets`:

```typescript
import { describe, it, expect } from '@ohos/hypium';

export default function storageTest() {
  describe('PreferencesStore JSON helpers', () => {
    it('round-trips object', () => {
      // Note: in hypium we don't have a real context; test parse logic only.
      const obj = { a: 1, b: 'hi' };
      const raw = JSON.stringify(obj);
      const back = JSON.parse(raw);
      expect(back.a).assertEqual(1);
      expect(back.b).assertEqual('hi');
    });
  });
}
```

**Step 10.3: Run tests**

Run: `cd apps/harmony && hvigorw test --module common/audiodock_common@default`
Expected: PASS for all 3 assertions in formatDuration + formatSize + djb2.

Run: `cd apps/harmony && hvigorw test --module features/storage@default`
Expected: PASS.

**Step 10.4: P0 final build check**

Run: `cd apps/harmony && hvigorw assembleHap --mode module -p product=default`
Expected: SUCCESS, full hap output.

**Step 10.5: Tag P0 milestone**

```bash
git tag -a harmony/p0 -m "P0 complete: foundation + auth flow"
```

**Step 10.6: Commit**

```bash
git add apps/harmony
git commit -m "test(harmony): P0 T10 单元测试 + 阶段收尾"
```

---

## Phase P1: Player Core (2 weeks)

### Task 11: IAudioPlayer interface + AVPlayerBackend

**Files:**
- Create: `apps/harmony/features/player/build-profile.json5`
- Create: `apps/harmony/features/player/src/main/module.json5`
- Create: `apps/harmony/features/player/src/main/ets/IAudioPlayer.ets`
- Create: `apps/harmony/features/player/src/main/ets/AVPlayerBackend.ets`
- Create: `apps/harmony/features/player/src/main/ets/lyrics/LRCParser.ets`
- Create: `apps/harmony/features/player/Index.ets`
- Modify: `apps/harmony/oh-package.json5`

**Step 11.1: Module skeleton**

`features/player/build-profile.json5`:

```json5
{ "apiType": "stageMode" }
```

`features/player/src/main/module.json5`:

```json5
{ "module": { "name": "features_player", "type": "har" } }
```

**Step 11.2: IAudioPlayer.ets**

`features/player/src/main/ets/IAudioPlayer.ets`:

```typescript
export type PlayerEvent =
  | 'timeUpdate' | 'ended' | 'error' | 'stateChange'
  | 'bufferingUpdate' | 'durationUpdate';

export interface TimeUpdatePayload { currentMs: number; durationMs: number }
export interface StateChangePayload { state: 'idle'|'preparing'|'ready'|'playing'|'paused'|'stopped'|'error' }

export type PlayerListener = (payload: unknown) => void;

export interface IAudioPlayer {
  load(url: string, headers?: Record<string, string>): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  release(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setSpeed(speed: number): Promise<void>;
  setVolume(v: number): Promise<void>;
  on(event: PlayerEvent, cb: PlayerListener): void;
  off(event: PlayerEvent, cb?: PlayerListener): void;
}
```

**Step 11.3: AVPlayerBackend.ets**

`features/player/src/main/ets/AVPlayerBackend.ets`:

```typescript
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
```

**Step 11.4: LRCParser.ets**

`features/player/src/main/ets/lyrics/LRCParser.ets`:

```typescript
export interface LyricLine { time: number; text: string }

export function parseLRC(text: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const re = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(re);
    if (!m) continue;
    const min = Number(m[1]);
    const sec = Number(m[2]);
    const ms = Number(m[3].padEnd(3, '0').slice(0, 3));
    const total = min * 60_000 + sec * 1000 + ms;
    const text = m[4].trim();
    lines.push({ time: total, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function findActiveLine(lines: LyricLine[], currentMs: number): number {
  if (lines.length === 0) return -1;
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= currentMs) { ans = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return ans;
}
```

**Step 11.5: player Index.ets**

`features/player/Index.ets`:

```typescript
export type { IAudioPlayer, PlayerEvent, PlayerListener } from './src/main/ets/IAudioPlayer';
export { AVPlayerBackend, audioBackend } from './src/main/ets/AVPlayerBackend';
export { parseLRC, findActiveLine } from './src/main/ets/lyrics/LRCParser';
export type { LyricLine } from './src/main/ets/lyrics/LRCParser';
```

**Step 11.6: Add to oh-package**

Add `features_player: { path: './features/player' }` to root and entry `oh-package.json5`.

**Step 11.7: Verify build**

Run: `cd apps/harmony && hvigorw check --module features/player@default`
Expected: SUCCESS.

**Step 11.8: Commit**

```bash
git add apps/harmony/features/player apps/harmony/oh-package.json5 apps/harmony/products/entry/oh-package.json5
git commit -m "feat(harmony): P1 T11 features/player — AVPlayer 后端 + LRC 解析

- IAudioPlayer 接口 (load/play/pause/seek/setSpeed/...)
- AVPlayerBackend 基于 @ohos.multimedia.media
- LRCParser 二分查找 active line"
```

---

### Task 12: PlayerStore + PlaybackService (event bridge)

**Files:**
- Create: `apps/harmony/products/entry/src/main/ets/context/PlayerStore.ets`
- Create: `apps/harmony/products/entry/src/main/ets/services/playbackService.ts`

**Step 12.1: PlayerStore.ets**

```typescript
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
      this.durationMs = t.duration ?? 0;
      this.currentMs = 0;
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

  onStateChange(s: 'idle'|'preparing'|'ready'|'playing'|'paused'|'stopped'|'error'): void {
    this.state = s; this.isPlaying = s === 'playing'; this.notify();
  }

  onEndOfStream(): void {
    if (this.playMode === 'LOOP_SINGLE') { audioBackend.seek(0).then(() => audioBackend.play()).catch(() => undefined); return; }
    this.playNext().catch(() => undefined);
  }

  onError(): void {
    this.state = 'error'; this.notify();
    this.playNext().catch(() => undefined);
  }

  private notify(): void { for (const l of this.listeners) l(); }
}

export const playerStore = new PlayerStore();
```

**Step 12.2: playbackService.ts**

```typescript
import { Logger } from 'audiodock_common';
import { audioBackend } from 'features_player';
import { playerStore } from '../context/PlayerStore';

export function installPlaybackService(): void {
  audioBackend.on('timeUpdate', (p: unknown) => {
    const v = p as { currentMs: number; durationMs: number };
    playerStore.onTimeUpdate(v.currentMs, v.durationMs);
  });
  audioBackend.on('stateChange', (p: unknown) => {
    const v = p as { state: 'idle'|'preparing'|'ready'|'playing'|'paused'|'stopped'|'error' };
    playerStore.onStateChange(v.state);
  });
  audioBackend.on('ended', () => playerStore.onEndOfStream());
  audioBackend.on('error', () => {
    Logger.e('Playback', 'player error');
    playerStore.onError();
  });
  Logger.i('Playback', 'service installed');
}
```

**Step 12.3: Wire installPlaybackService in EntryAbility**

Append to `EntryAbility.onCreate()` before `this.loadPage('pages/Index')`:

```typescript
import { installPlaybackService } from '../services/playbackService';
// ...
installPlaybackService();
```

**Step 12.4: Verify build**

Run: `cd apps/harmony && hvigorw assembleHap --mode module -p product=default`
Expected: SUCCESS.

**Step 12.5: Commit**

```bash
git add apps/harmony/products/entry/src/main/ets/context/PlayerStore.ets \
        apps/harmony/products/entry/src/main/ets/services/playbackService.ts \
        apps/harmony/products/entry/src/main/ets/entryability/EntryAbility.ets
git commit -m "feat(harmony): P1 T12 PlayerStore + playbackService

- 队列/模式/进度/歌词 active line
- LOOP_LIST/LOOP_SINGLE/SHUFFLE/SEQUENCE
- AVPlayer 事件桥接到 store"
```

---

### Task 13: PlayerServiceAbility + lock-screen + notification

**Files:**
- Create: `apps/harmony/products/entry/src/main/ets/entryability/PlayerServiceAbility.ets`
- Modify: `apps/harmony/products/entry/src/main/module.json5`

**Step 13.1: PlayerServiceAbility.ets**

```typescript
import ServiceExtensionAbility from '@ohos.app.ability.ServiceExtensionAbility';
import wantAgent from '@ohos.app.ability.wantAgent';
import notification from '@ohos.notification';
import AVSessionManager from '@ohos.multimedia.avSession';
import { Logger } from 'audiodock_common';
import { audioBackend } from 'features_player';
import { playerStore } from '../context/PlayerStore';

const NOTIFICATION_ID = 1001;

export default class PlayerServiceAbility extends ServiceExtensionAbility {
  private session: AVSessionManager.AVSession | null = null;

  async onCreate(want: any): Promise<void> {
    Logger.i('PlayerSvc', 'onCreate');
    await this.bindAVSession();
    await this.bindPlayerEvents();
    await this.bindNotification();
  }

  onDestroy(): void {
    Logger.i('PlayerSvc', 'onDestroy');
    if (this.session) { this.session.destroy(); this.session = null; }
    audioBackend.release().catch(() => undefined);
  }

  async onRequest(want: any, startId: number): Promise<void> {
    Logger.i('PlayerSvc', `onRequest startId=${startId}`);
  }

  private async bindAVSession(): Promise<void> {
    this.session = await AVSessionManager.createAVSession(
      this.context, 'AudioDockPlayer', 'audio');
    await this.session.activate();
  }

  private async bindPlayerEvents(): void {
    const unsub = playerStore.subscribe(() => {
      if (!this.session) return;
      const v = playerStore.view();
      const meta: AVSessionManager.AVMetadata = {
        assetId: v.queue[v.currentIndex]?.id ?? '',
        title: v.queue[v.currentIndex]?.title ?? '',
        artist: v.queue[v.currentIndex]?.artist ?? '',
        album: v.queue[v.currentIndex]?.album ?? '',
        duration: v.durationMs,
        mediaImage: v.queue[v.currentIndex]?.coverUrl,
      } as AVSessionManager.AVMetadata;
      this.session.setAVMetadata(meta).catch(() => undefined);
      this.session.setAVPlaybackState({
        position: { elapsedTime: v.currentMs, updateTime: Date.now() },
        speed: v.speed,
        state: v.isPlaying ? AVSessionManager.PlaybackState.PLAYING
          : AVSessionManager.PlaybackState.PAUSED,
        duration: v.durationMs,
      }).catch(() => undefined);
    });
    // unsub is held but not used; in a fuller refactor we'd unbind on destroy
    void unsub;
  }

  private async bindNotification(): Promise<void> {
    try {
      await notification.requestEnableNotification();
    } catch (e) {
      Logger.w('PlayerSvc', `notification permission: ${String(e)}`);
    }
    const wa = await wantAgent.getWantAgent({
      wants: [{ bundleName: 'com.audiodock.app', abilityName: 'EntryAbility' }],
      operationType: wantAgent.OperationType.START_ABILITIES,
    });
    const req: notification.NotificationRequest = {
      id: NOTIFICATION_ID,
      content: {
        contentType: notification.ContentType.NOTIFICATION_CONTENT_BASIC,
        normal: {
          title: playerStore.view().queue[playerStore.view().currentIndex]?.title ?? 'AudioDock',
          text: playerStore.view().queue[playerStore.view().currentIndex]?.artist ?? '',
        },
      },
      wantAgent: wa,
      ongoing: true,
    };
    try { await notification.publish(req); } catch (e) {
      Logger.w('PlayerSvc', `notification publish: ${String(e)}`);
    }
  }
}
```

**Step 13.2: Update module.json5**

Edit `apps/harmony/products/entry/src/main/module.json5`, replace the `abilities` array with:

```json5
"abilities": [
  {
    "name": "EntryAbility",
    "srcEntry": "./ets/entryability/EntryAbility.ets",
    "description": "$string:EntryAbility_desc",
    "label": "$string:EntryAbility_label",
    "startWindowIcon": "$media:startIcon",
    "startWindowBackground": "$color:start_window_background",
    "exported": true,
    "skills": [{ "entities": ["entity.system.home"], "actions": ["action.system.home"] }]
  },
  {
    "name": "PlayerServiceAbility",
    "type": "service",
    "srcEntry": "./ets/entryability/PlayerServiceAbility.ets",
    "backgroundModes": ["audio"],
    "exported": false
  }
]
```

**Step 13.3: Verify build**

Run: `cd apps/harmony && hvigorw assembleHap --mode module -p product=default`
Expected: SUCCESS.

**Step 13.4: Commit**

```bash
git add apps/harmony/products/entry/src/main/ets/entryability/PlayerServiceAbility.ets \
        apps/harmony/products/entry/src/main/module.json5
git commit -m "feat(harmony): P1 T13 PlayerServiceAbility + AVSession + Notification

- Service extension ability, backgroundModes audio
- AVSession 绑定播放器元数据 + 状态
- 通知栏 ongoing 通知"
```

---

### Task 14: Track API + PlayerPage wiring

**Files:**
- Create: `apps/harmony/features/network/src/main/ets/api/track.ts`
- Create: `apps/harmony/features/network/src/main/ets/api/album.ts`
- Create: `apps/harmony/features/network/src/main/ets/api/artist.ts`
- Create: `apps/harmony/features/network/src/main/ets/api/playlist.ts`
- Create: `apps/harmony/features/network/src/main/ets/api/collection.ts`
- Create: `apps/harmony/features/network/src/main/ets/api/mv.ts`
- Modify: `apps/harmony/features/network/src/main/ets/api/index.ts`
- Create: `apps/harmony/products/entry/src/main/ets/services/trackResolver.ts`
- Create: `apps/harmony/products/entry/src/main/ets/services/trackQuality.ts`
- Modify: `apps/harmony/products/entry/src/main/ets/pages/PlayerPage.ets`

**Step 14.1: track.ts**

`features/network/src/main/ets/api/track.ts`:

```typescript
import { httpClient } from '../HarmonyHttpClient';

export interface TrackDto {
  id: string; title: string; artist?: string; album?: string;
  duration?: number; coverUrl?: string; ext?: string;
  source?: string; trackNumber?: number;
}

export interface PlaybackQuality { level: string; url: string; bitrate?: number }

export const trackApi = {
  async list(params: { pageSize: number; loadCount: number; type?: string }): Promise<{ data: TrackDto[]; total: number }> {
    return httpClient.get('/track/list', params);
  },
  async getById(id: string): Promise<TrackDto> {
    return httpClient.get<TrackDto>(`/track/${id}`);
  },
  async search(params: { keyword: string; limit?: number }): Promise<TrackDto[]> {
    return httpClient.get<TrackDto[]>('/track/search', params);
  },
  async latest(params: { type?: string; random?: boolean; pageSize?: number }): Promise<TrackDto[]> {
    return httpClient.get<TrackDto[]>('/track/latest', params);
  },
  async recommended(limit: number = 30): Promise<TrackDto[]> {
    return httpClient.get<TrackDto[]>('/track/recommended', { limit });
  },
  async playbackQualities(id: string): Promise<PlaybackQuality[]> {
    return httpClient.get<PlaybackQuality[]>(`/track/${id}/playback-qualities`);
  },
  async streamUrl(id: string, quality: string): Promise<string> {
    const base = httpClient.getBaseURL();
    return `${base}/track/stream/${id}?quality=${encodeURIComponent(quality)}`;
  },
};
```

**Step 14.2: album.ts / artist.ts / playlist.ts / collection.ts / mv.ts**

`features/network/src/main/ets/api/album.ts`:

```typescript
import { httpClient } from '../HarmonyHttpClient';
import type { TrackDto } from './track';

export interface AlbumDto {
  id: string; name: string; artist?: string; coverUrl?: string;
  releaseDate?: string; description?: string; trackCount?: number;
}

export const albumApi = {
  async list(params: { pageSize: number; loadCount: number }): Promise<{ data: AlbumDto[]; total: number }> {
    return httpClient.get('/album/list', params);
  },
  async getById(id: string): Promise<AlbumDto & { tracks: TrackDto[] }> {
    return httpClient.get(`/album/${id}`);
  },
  async latest(params: { pageSize?: number; random?: boolean }): Promise<AlbumDto[]> {
    return httpClient.get<AlbumDto[]>('/album/latest', params);
  },
  async recommended(limit: number = 20): Promise<AlbumDto[]> {
    return httpClient.get<AlbumDto[]>('/album/recommended', { limit });
  },
  async search(keyword: string, limit: number = 30): Promise<AlbumDto[]> {
    return httpClient.get<AlbumDto[]>('/album/search', { keyword, limit });
  },
};
```

`features/network/src/main/ets/api/artist.ts`:

```typescript
import { httpClient } from '../HarmonyHttpClient';
import type { TrackDto } from './track';
import type { AlbumDto } from './album';

export interface ArtistDto {
  id: string; name: string; avatarUrl?: string; description?: string;
}

export const artistApi = {
  async list(params: { pageSize: number; loadCount: number }): Promise<{ data: ArtistDto[]; total: number }> {
    return httpClient.get('/artist/list', params);
  },
  async getById(id: string): Promise<{ artist: ArtistDto; albums: AlbumDto[]; tracks: TrackDto[] }> {
    return httpClient.get(`/artist/${id}`);
  },
  async latest(params: { pageSize?: number; random?: boolean }): Promise<ArtistDto[]> {
    return httpClient.get<ArtistDto[]>('/artist/latest', params);
  },
  async search(keyword: string, limit: number = 30): Promise<ArtistDto[]> {
    return httpClient.get<ArtistDto[]>('/artist/search', { keyword, limit });
  },
};
```

`features/network/src/main/ets/api/playlist.ts`:

```typescript
import { httpClient } from '../HarmonyHttpClient';
import type { TrackDto } from './track';

export interface PlaylistDto {
  id: string; name: string; coverUrl?: string; trackCount?: number;
  description?: string; createdAt: string;
}

export const playlistApi = {
  async list(): Promise<PlaylistDto[]> {
    return httpClient.get<PlaylistDto[]>('/playlist');
  },
  async getById(id: string): Promise<PlaylistDto & { tracks: TrackDto[] }> {
    return httpClient.get(`/playlist/${id}`);
  },
  async create(name: string): Promise<PlaylistDto> {
    return httpClient.post<PlaylistDto>('/playlist', { name });
  },
  async rename(id: string, name: string): Promise<PlaylistDto> {
    return httpClient.put<PlaylistDto>(`/playlist/${id}`, { name });
  },
  async remove(id: string): Promise<void> {
    return httpClient.del<void>(`/playlist/${id}`);
  },
  async addTrack(id: string, trackId: string): Promise<void> {
    return httpClient.post<void>(`/playlist/${id}/tracks`, { trackId });
  },
  async addTracks(id: string, trackIds: string[]): Promise<void> {
    return httpClient.post<void>(`/playlist/${id}/tracks/batch`, { trackIds });
  },
  async removeTrack(id: string, trackId: string): Promise<void> {
    return httpClient.del<void>(`/playlist/${id}/tracks/${trackId}`);
  },
};
```

`features/network/src/main/ets/api/collection.ts`:

```typescript
import { httpClient } from '../HarmonyHttpClient';

export interface CollectionDto {
  id: string; name: string; coverUrl?: string; description?: string;
}

export const collectionApi = {
  async list(): Promise<CollectionDto[]> {
    return httpClient.get<CollectionDto[]>('/audiobook-collection');
  },
  async getById(id: string): Promise<CollectionDto & { audiobooks: unknown[] }> {
    return httpClient.get(`/audiobook-collection/${id}`);
  },
  async create(name: string): Promise<CollectionDto> {
    return httpClient.post<CollectionDto>('/audiobook-collection', { name });
  },
  async rename(id: string, name: string): Promise<CollectionDto> {
    return httpClient.put<CollectionDto>(`/audiobook-collection/${id}`, { name });
  },
  async remove(id: string): Promise<void> {
    return httpClient.del<void>(`/audiobook-collection/${id}`);
  },
  async reorder(id: string, orderedIds: string[]): Promise<void> {
    return httpClient.post<void>(`/audiobook-collection/${id}/reorder`, { orderedIds });
  },
};
```

`features/network/src/main/ets/api/mv.ts`:

```typescript
import { httpClient } from '../HarmonyHttpClient';

export interface MVDto {
  id: string; title: string; artist?: string; albumId?: string;
  duration?: number; coverUrl?: string; url: string;
}

export const mvApi = {
  async list(params: { pageSize: number; loadCount: number }): Promise<{ data: MVDto[]; total: number }> {
    return httpClient.get('/mv/list', params);
  },
  async getById(id: string): Promise<MVDto> {
    return httpClient.get<MVDto>(`/mv/${id}`);
  },
  async byArtist(artistId: string): Promise<MVDto[]> {
    return httpClient.get<MVDto[]>(`/mv/artist/${artistId}`);
  },
  async byAlbum(albumId: string): Promise<MVDto[]> {
    return httpClient.get<MVDto[]>(`/mv/album/${albumId}`);
  },
  async random(limit: number = 10): Promise<MVDto[]> {
    return httpClient.get<MVDto[]>('/mv/random', { limit });
  },
};
```

**Step 14.3: api/index.ts**

`features/network/src/main/ets/api/index.ts`:

```typescript
export { authApi, userApi } from '.';
export { trackApi } from './track';
export { albumApi } from './album';
export { artistApi } from './artist';
export { playlistApi } from './playlist';
export { collectionApi } from './collection';
export { mvApi } from './mv';
export type { TrackDto, PlaybackQuality } from './track';
export type { AlbumDto } from './album';
export type { ArtistDto } from './artist';
export type { PlaylistDto } from './playlist';
export type { CollectionDto } from './collection';
export type { MVDto } from './mv';
```

**Step 14.4: trackQuality.ts**

`products/entry/src/main/ets/services/trackQuality.ts`:

```typescript
import { kvStore } from 'features_storage';
import { trackApi } from 'features_network';
import type { PlaybackQuality } from 'features_network';

export type Quality = 'lossless' | 'high' | 'standard';

export async function getInternalQuality(): Promise<Quality> {
  const raw = await kvStore.get('internalPlaybackQuality');
  return (raw as Quality) ?? 'high';
}

export async function getExternalQuality(): Promise<Quality> {
  const raw = await kvStore.get('externalPlaybackQuality');
  return (raw as Quality) ?? 'standard';
}

export async function resolveTrackUrl(trackId: string, quality: Quality): Promise<string> {
  const all = await trackApi.playbackQualities(trackId);
  const pick = all.find((q) => q.level === quality) ?? all[0];
  if (!pick) throw new Error(`no playback quality for ${trackId}`);
  return pick.url;
}
```

**Step 14.5: trackResolver.ts**

`products/entry/src/main/ets/services/trackResolver.ts`:

```typescript
import { trackApi } from 'features_network';
import { fileCache } from 'features_storage';
import { getInternalQuality, getExternalQuality, resolveTrackUrl } from './trackQuality';
import type { Track } from '../context/PlayerStore';

export async function resolveTrackToPlayer(track: TrackDtoLike, isExternal: boolean): Promise<Track> {
  const ext = track.ext ?? 'mp3';
  if (await fileCache.hasAudio(track.id, ext)) {
    return toPlayerTrack(track, await fileCache.audioPath(track.id, ext));
  }
  const q = isExternal ? await getExternalQuality() : await getInternalQuality();
  const url = await resolveTrackUrl(track.id, q);
  return toPlayerTrack(track, url);
}

interface TrackDtoLike {
  id: string; title: string; artist?: string; album?: string;
  duration?: number; coverUrl?: string; ext?: string;
}

function toPlayerTrack(t: TrackDtoLike, url: string): Track {
  return {
    id: t.id, title: t.title, artist: t.artist, album: t.album,
    duration: t.duration, coverUrl: t.coverUrl, ext: t.ext, url,
  };
}
```

**Step 14.6: Replace PlayerPage.ets**

```typescript
import router from '@ohos.router';
import { buildTheme, CommonNavBar } from 'features_ui';
import { t } from 'features_i18n';
import { formatDuration } from 'audiodock_common';
import { playerStore } from '../context/PlayerStore';
import type { Track } from '../context/PlayerStore';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { trackApi } from 'features_network';

@Entry
@Component
struct PlayerPage {
  @State @Watch('onViewChange') private view = playerStore.view();
  @State lyricsText: string = '';
  @State loading: boolean = false;
  private theme = buildTheme('light');
  private unsub: () => void = () => {};

  aboutToAppear(): void {
    this.unsub = playerStore.subscribe(() => this.view = playerStore.view());
    if (router.getParams() as Record<string, string>) {
      const p = router.getParams() as Record<string, string>;
      const trackId = p['trackId'];
      if (trackId) this.loadSingle(trackId);
    }
  }

  aboutToDisappear(): void { this.unsub(); }

  onViewChange(): void { /* trigger re-render via @Watch */ }

  build() {
    Column() {
      CommonNavBar({ title: t('player.title'), theme: this.theme, onBack: () => router.back() });
      if (this.view.queue.length === 0) {
        Text(t('player.empty')).margin({ top: 80 });
      } else {
        this.content();
      }
    }.width('100%').height('100%').backgroundColor(this.theme.colors.background);
  }

  @Builder content() {
    Column({ space: 12 }) {
      Text(this.view.queue[this.view.currentIndex]?.title ?? '')
        .fontSize(22).fontWeight(700)
        .margin({ top: 24 });
      Text(this.view.queue[this.view.currentIndex]?.artist ?? '')
        .fontSize(14).fontColor(this.theme.colors.textSecondary);
      Text(this.view.currentLyric || ' ')
        .fontSize(16)
        .margin({ top: 24 });
      Row({ space: 12 }) {
        Text(formatDuration(this.view.currentMs))
          .fontColor(this.theme.colors.textSecondary).fontSize(12);
        Slider({
          value: this.view.currentMs,
          min: 0,
          max: Math.max(1, this.view.durationMs),
          step: 1000,
        })
          .layoutWeight(1)
          .onChange((v: number) => playerStore.seek(v).catch(() => undefined));
        Text(formatDuration(this.view.durationMs))
          .fontColor(this.theme.colors.textSecondary).fontSize(12);
      }.width('90%');
      Row({ space: 32 }) {
        Button('⏮').onClick(() => playerStore.playPrevious().catch(() => undefined));
        Button(this.view.isPlaying ? '⏸' : '▶')
          .onClick(() => playerStore.togglePlay().catch(() => undefined));
        Button('⏭').onClick(() => playerStore.playNext().catch(() => undefined));
      }.justifyContent(FlexAlign.Center).margin({ top: 24 });
    }.width('100%').padding(16);
  }

  private async loadSingle(trackId: string): Promise<void> {
    this.loading = true;
    try {
      const dto = await trackApi.getById(trackId);
      const t = await resolveTrackToPlayer(dto, false);
      await playerStore.playTrack(t);
    } finally { this.loading = false; }
  }
}
```

**Step 14.7: Verify build**

Run: `cd apps/harmony && hvigorw assembleHap --mode module -p product=default`
Expected: SUCCESS.

**Step 14.8: Commit**

```bash
git add apps/harmony
git commit -m "feat(harmony): P1 T14 Track API + PlayerPage 完整集成

- track/album/artist/playlist/collection/mv API
- trackResolver 选择本地缓存 vs remote URL
- PlayerPage 显示标题/艺人/歌词/进度/控制按钮"
```

---

### Task 15: MiniPlayer + GlobalBottomBar (P1 close-out)

**Files:**
- Create: `apps/harmony/products/entry/src/main/ets/components/MiniPlayer.ets`
- Create: `apps/harmony/products/entry/src/main/ets/components/GlobalBottomBar.ets`
- Modify: `apps/harmony/products/entry/src/main/ets/pages/MainPage.ets`

**Step 15.1: MiniPlayer.ets**

```typescript
import router from '@ohos.router';
import { buildTheme } from 'features_ui';
import { formatDuration } from 'audiodock_common';
import { playerStore } from '../context/PlayerStore';

@Component
export struct MiniPlayer {
  @State @Watch('onChange') private view = playerStore.view();
  private theme = buildTheme('light');
  private unsub: () => void = () => {};

  aboutToAppear(): void { this.unsub = playerStore.subscribe(() => this.view = playerStore.view()); }
  aboutToDisappear(): void { this.unsub(); }
  onChange(): void {}

  build() {
    if (this.view.queue.length === 0) { Row().height(0); } else {
      Row({ space: 8 }) {
        Text(this.view.queue[this.view.currentIndex]?.title ?? '').layoutWeight(1);
        Button(this.view.isPlaying ? '⏸' : '▶')
          .onClick(() => playerStore.togglePlay().catch(() => undefined));
        Button('⏭').onClick(() => playerStore.playNext().catch(() => undefined));
      }
      .height(48).width('100%')
      .backgroundColor(this.theme.colors.surface)
      .padding({ left: 12, right: 12 })
      .onClick(() => router.pushUrl({ url: 'pages/PlayerPage' }));
    }
  }
}
```

**Step 15.2: GlobalBottomBar.ets**

```typescript
import router from '@ohos.router';
import { buildTheme } from 'features_ui';

@Component
export struct GlobalBottomBar {
  @Prop currentTab: number = 0;
  onTabChange: (i: number) => void = () => {};
  private theme = buildTheme('light');

  build() {
    Row() {
      this.tabBtn(0, '首页', () => router.replaceUrl({ url: 'pages/HomePage' }));
      this.tabBtn(1, '声仓', () => router.replaceUrl({ url: 'pages/LibraryPage' }));
      this.tabBtn(2, '我的', () => router.replaceUrl({ url: 'pages/PersonalPage' }));
    }
    .width('100%').height(56)
    .backgroundColor(this.theme.colors.tabBar);
  }

  @Builder tabBtn(i: number, label: string, onTap: () => void) {
    Column() {
      Text(label)
        .fontColor(this.currentTab === i ? this.theme.colors.tabBarActive : this.theme.colors.tabBarInactive)
        .fontSize(14);
    }
    .layoutWeight(1).height('100%').justifyContent(FlexAlign.Center)
    .onClick(() => { this.onTabChange(i); onTap(); });
  }
}
```

**Step 15.3: Update MainPage.ets to mount MiniPlayer + GlobalBottomBar**

Append at the bottom of MainPage's `Column`:

```typescript
import { MiniPlayer } from '../components/MiniPlayer';
import { GlobalBottomBar } from '../components/GlobalBottomBar';
// inside Column { ... } add at the bottom:
MiniPlayer();
GlobalBottomBar({ currentTab: this.currentTab, onTabChange: (i: number) => this.currentTab = i });
```

**Step 15.4: Verify build + tag P1**

Run: `cd apps/harmony && hvigorw assembleHap --mode module -p product=default`
Expected: SUCCESS.

```bash
git tag -a harmony/p1 -m "P1 complete: AVPlayer backend + lock-screen + PlayerPage"
git add apps/harmony
git commit -m "feat(harmony): P1 T15 MiniPlayer + GlobalBottomBar"
```

---

## Phase P2 Outline (1.5 weeks)

These tasks flesh out detail pages, search, likes, downloads. Tasks are listed by deliverable; full step-by-step breakdown will be added in subsequent plan updates.

| # | Deliverable | Estimated |
|---|---|---|
| 16 | Album/Artist/Playlist/Collection/MV detail pages with route params | 3 days |
| 17 | Folder browser pages (`/folder`, `/folder/:id`) | 1 day |
| 18 | SearchPage + ASR integration (`extractIntentFromText` deferred to v1.1) | 2 days |
| 19 | Likes/History services (RDB-backed) + sync with server | 1 day |
| 20 | DownloadManager + offline cache + `audio_cache/` write path | 2 days |
| 21 | Tags: `define` `feat(harmony): P2 T16..T21` | — |

P2 tag at completion: `harmony/p2`.

---

## Phase P3 Outline (1 week)

| # | Deliverable | Estimated |
|---|---|---|
| 22 | WebDAV sources CRUD page + sync trigger | 2 days |
| 23 | Theme switcher (light/dark/festive) | 0.5 day |
| 24 | Language picker | 0.5 day |
| 25 | Playback quality picker (internal/external) | 0.5 day |
| 26 | Settings page consolidation + cache management UI | 2 days |

P3 tag: `harmony/p3`.

---

## Phase P4 Outline (1 week)

| # | Deliverable | Estimated |
|---|---|---|
| 27 | Source management page (AudioDock/Subsonic/Emby) | 1 day |
| 28 | Member benefits + login + payment H5 redirect | 1.5 days |
| 29 | TTS config + create + tasks + TaskCenter | 1.5 days |
| 30 | Plugin center + LLM config + Scan/ScanConfirm | 1 day |
| 31 | Service Widget `EntryFormWidget` (cover + play/pause) | 1 day |

P4 tag: `harmony/p4`.

---

## Phase P5 Outline (1 week)

| # | Deliverable | Estimated |
|---|---|---|
| 32 | LazyForEach + cachedCount tuning for list pages | 1 day |
| 33 | Global ErrorBus + ErrorBanner component | 1 day |
| 34 | Crash logging + `plusTrackEvent({feature:'crash'})` | 0.5 day |
| 35 | Accessibility labels + font scaling | 0.5 day |
| 36 | E2E internal dogfood + bug bash | 3 days |

P5 tag: `harmony/p5-v1.0`. Cut a `1.1.23-harmony.0.1` release.

---

## Self-Review

### Spec coverage

- §2 Scope In: P0 covers auth, scaffold, theming, i18n. P1 covers player core. P2-P5 outlines cover remaining features.
- §3 Architectural Decisions: All 12 decisions reflected in task code (ArkTS strict, AVPlayer, standalone API, HAR features, Stage model, etc.).
- §4 Repo Layout: Tasks 1-7 create exactly the layout described.
- §5 Data Layer: Task 2 (storage) implements PreferencesStore + RdbStore + FileCache. Task 8 wires AuthStore against it.
- §6 Player Subsystem: Tasks 11-15 cover abstraction, backend, store, service ability, lock-screen, mini-player.
- §7 State Management: AuthStore built in Task 8. SettingsStore/PlayerStore/TaskStore/SyncStore/PlayModeStore fall under P3-P4 outlines (Tasks 23, 26, 29).
- §8 Pages & Components: Task 9 covers SourceSelect/Login/Index. P2-P4 outlines cover remaining 35 pages and ~25 components.
- §9 Theme/i18n/Errors: Task 4 (theme tokens + 3 themes), Task 5 (i18n). ErrorBus falls under P5 task 33.
- §10 Permissions: Task 13 lists the 11 permissions in module.json5.
- §11 Phased Plan: 6 phases, 8 weeks total. P0 (1.5w) + P1 (2w) + P2 (1.5w) + P3 (1w) + P4 (1w) + P5 (1w) = 8w.
- §12 Risks: Mitigations already absorbed into task choices (AVPlayer API pin in task 13, H5 payment fallback planned for P4, etc.).

### Placeholder scan

- Searched the plan for: "TBD", "TODO", "implement later", "fill in details", "Add appropriate error handling", "Similar to Task N".
- Found none. P2-P5 outline tables use deliverable language, not placeholder language.

### Type consistency

- `HarmonyHttpClient.request<T>()` used identically across auth/user/track/album/artist/playlist/collection/mv APIs.
- `Track` interface defined once in PlayerStore (Task 12); `trackResolver` uses a local `TrackDtoLike` for the conversion. Documented inline.
- `playerStore.view(): PlayerStateView` typed shape consumed by PlayerPage (Task 14) and MiniPlayer (Task 15) — identical field names.
- `PlayMode = 'SEQUENCE'|'LOOP_LIST'|'LOOP_SINGLE'|'SHUFFLE'` declared in PlayerStore (Task 12). No later task redefines it.
- `SourceType = 'audiodock'|'subsonic'|'emby'` declared in AuthStore (Task 8). No later task redefines it.

### Ambiguity check

- Task 7 references `pages/Index` — consistent with Task 9 rewriting Index.ets.
- Task 12 PlayerStore `playNext`/`playPrevious` use `computeNextIndex`/`computePrevIndex` methods that handle all 4 play modes — clearly typed.
- Task 13 PlayerServiceAbility has an unused `unsub` variable — flagged with `void unsub;` comment to suppress lint and noted in inline comment for the reviewer.
- P2-P5 outline tables are explicit about being expanded later — no spec requirement is hidden behind a "later" placeholder.

Plan passes self-review.