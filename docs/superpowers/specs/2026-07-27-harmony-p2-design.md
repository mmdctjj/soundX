# AudioDock HarmonyOS Client — P2 Design Spec

- Date: 2026-07-27
- Branch: `feat/hm` (current HEAD `8af0fb86`, P1 tagged)
- Author: brainstorming output
- Status: design approved, awaiting implementation plan
- Supersedes P2 outline tasks 16–20 in `docs/superpowers/plans/2026-07-27-harmony-client-mvp.md` (fold Folder + DownloadManager into later phases; narrow Search to text-only)

## 1. Goal & Scope

### 1.1 Goal

Stand up the **content → search → like** path on top of the P0/P1 foundation (which delivered the build pipeline, storage, network, i18n, theme, auth, and the AVPlayer-backed player with lock-screen + notification). After P2, a user can browse content from Home/Library, open a detail page, search for new content, and persist likes + history to disk; offline play + sync are deferred to later phases.

### 1.2 In scope

- **T16 Detail page family** — `AlbumDetailPage`, `ArtistDetailPage`, `PlaylistDetailPage`, `CollectionDetailPage`, `MVDetailPage`. Each page takes the id via `router.getParams()['id']`, calls the matching API, renders header + description + track list (or artist sub-tabs), and dispatches `playerStore.playTrackList`/`playTrack`.
- **T18 Text Search** — `SearchPage` with a 300ms debounce text input, top-20 search history from local RDB, four result tabs (Track / Album / Artist / Playlist). No voice/ASR.
- **T19 LikesHistoryService** — single service covering `track_like` / `album_like` / `track_history`. Local-first writes to `RdbStore`, background async sync queue posting to server, event subscription for UI refresh.

### 1.3 Out of scope (deferred)

- T17 Folder browser (`/folder`, `/folder/:id`) — moved to P3.
- T20 DownloadManager + offline audio cache write path — moved to P3.
- Search ASR (microphone capture + ASR API) — deferred; entry point not present.
- Service Widget (`EntryFormWidget`) — P4.
- Member benefits / TTS / Plugin center / LLM config / Scan — P4 per existing outline.
- Cache management UI, theme switcher, language picker — P3.
- Cleanup of P0 T4 deferred minors (trailing newlines, `FontWeight` enum collision, unused `audiodock_common` dep, `@Prop` callbacks, hardcoded color in `CommonButton` ghost variant) — P5 alongside final review.

## 2. Architecture & Data Flow

```
Home/Library Tab ─┐
SearchPage ───────┤
ArtistDetail ─────┼─ router.pushUrl({ url:'pages/AlbumDetailPage', params:{id} })
                  ▼
            DetailPage (Album/Artist/Playlist/Collection/MV)
              │  aboutToAppear: xxxApi.getById(id)
              │  @State data/loading/error; onClick → playerStore.playTrackList
              ▼
        PlayerStore (P1) ── PlayerServiceAbility ── AVPlayer

Likes write path:
DetailPage / PlayerPage / MiniPlayer action
  → LikesHistoryService.like / unlike / recordHistory (RdbStore immediate)
  → enqueue sync task to in-memory queue
  → setInterval(5000) drains the queue against server API
  → success: dequeue; failure: increment attempts, drop after 5
```

- **Routing**: existing `router.pushUrl` + `params.id`; no new router pattern.
- **State**: detail pages hold `@State` only (data/loading/error). No new store.
- **Shared services**: existing 6 stores unchanged. One new service: `LikesHistoryService` (singleton, event bus).
- **Reuse**: `TrackListItem` component, `resolveTrackToPlayer` service, `CommonNavBar` / `EmptyView` / `SkeletonBlock` from P0/P1.
- **Dependencies**: `LikesHistoryService` depends on `rdbStore` (writes) + `httpClient` (sync) + token from `authStore`. No new HAR module.

## 3. Module Design

### 3.1 Detail page family (T16)

- Files: `products/entry/src/main/ets/pages/{Album,Artist,Playlist,Collection,MV}DetailPage.ets`.
- Common shape (inline `@Builder`, no shared base class):

```ts
@State data: Dto | null = null;
@State loading: boolean = true;
@State error: string = '';
private id: string = '';

aboutToAppear(): void {
  const p = router.getParams() as Record<string, string>;
  this.id = p['id'] ?? '';
  this.load();
}

private async load(): Promise<void> {
  this.loading = true; this.error = '';
  try { this.data = await this.fetcher(this.id); }
  catch (e) { this.error = e instanceof Error ? e.message : String(e); }
  finally { this.loading = false; }
}
```

- Rendering:
  - Header band — cover (Album/Playlist/Collection) or avatar (Artist) or cover + duration (MV).
  - Description block — title, artist (where applicable), release year, summary.
  - Track list — `LazyForEach` over `data.tracks`; row `onClick` → `playerStore.playTrackList(tracks, index)` via `resolveTrackToPlayer`.
  - Artist page has two sub-tabs (热门单曲 / 专辑) implemented as conditional render to avoid nested `Tabs` (ArkTS limitation workaround).
  - MV detail page shows cover + title + description; actual `<video>` playback deferred to P3.
- Like button on Album/Playlist/Collection header dispatches `LikesHistoryService.likeAlbum(id) / unlikeAlbum(id)`; UI subscribes to the `albumLike` event for icon refresh.

### 3.2 SearchPage (T18)

- File: `products/entry/src/main/ets/pages/SearchPage.ets`.
- Data sources: existing `trackApi.search`, `albumApi.search`, `artistApi.search`, `playlistApi.search` from `features/network/api`.
- Layout:
  - Top: text input with 300ms debounce; submit writes to `rdbStore.upsertSearchKeyword`.
  - Hot-words row: chips from `rdbStore.listSearchKeywords(20)`; tap fills input.
  - Four tabs (Track / Album / Artist / Playlist) using `Tabs` component; each tab is a `LazyForEach` list; tap result navigates to the corresponding detail page.
- Network: `Promise.allSettled` against the four search endpoints; per-tab `EmptyView` shown if its result is empty or rejected; one tab's failure does not affect the others.
- i18n keys to add: `search.placeholder`, `search.hot_words`, `search.tab.track`, `search.tab.album`, `search.tab.artist`, `search.tab.playlist`, `search.empty`, `search.history_clear`.

### 3.3 LikesHistoryService (T19)

- File: `products/entry/src/main/ets/services/LikesHistoryService.ets`.
- Public API:
  - `likeTrack(id) / unlikeTrack(id) / isTrackLiked(id) / listLikedTracks()`
  - `likeAlbum(id) / unlikeAlbum(id) / isAlbumLiked(id) / listLikedAlbums()`
  - `recordHistory({track_id, progress, source}) / listHistory(limit)`
- Sync queue:
  - `queue: Array<{kind:'like_track'|'unlike_track'|'like_album'|'unlike_album'|'history'; payload:object; attempts:number}>`.
  - Single `setInterval(5000)` ticks `drain()`; one outstanding request at a time to avoid burst.
  - drain checks `authStore.state_.token`; if missing, clears queue and logs warning.
  - On server success → dequeue; on failure → increment `attempts`; drop + warn after 5 attempts.
  - Server endpoints (P2 uses placeholder if missing — flagged in task brief):
    - `POST /likes/track` `{trackId, liked:true|false}`
    - `POST /likes/album` `{albumId, liked:true|false}`
    - `POST /track-history` `{trackId, progress, playedAt, source}`
- Event bus: `on(kind:'trackLike'|'albumLike'|'history', cb)`; subscribers receive a `{id, liked}` / `{trackId, progress}` payload.
- Unit tests (hypium):
  - `LikesHistoryService.test.ets` — mock `rdbStore` and `httpClient`; verify immediate local write, drain after interval, retry counter, drop after 5 attempts.
  - `Search.test.ets` (in `features/network/src/test/`) — mock `httpClient`; verify parallel `Promise.allSettled` merge.

## 4. Error Handling, Testing, Risks

### 4.1 Error handling

- Detail page: `try/catch` in `load()`; on error show `EmptyView` with `error` text + "重试" button that re-invokes `load()`.
- Search: per-tab `Promise.allSettled`; failed tab shows its own `EmptyView`; other tabs continue.
- Likes sync: failure stays in queue with backoff-style attempts; UI never blocks on the network.
- History write failure: `Logger.w` only; never surfaces to UI.
- `drain()` guards: skip when `authStore.state_.token === null` (e.g. logged out mid-sync); logs warning and clears queue.

### 4.2 Testing

- Manual smoke for each detail page (entry → render → tap row → player responds).
- `hvigorw test` runs new hypium unit tests:
  - `LikesHistoryService` (local-first + drain + retry budget).
  - `Search` (parallel + merge + per-tab failure isolation).
- `hvigorw assembleHap --mode module -p product=default` runs after each task and at close-out.

### 4.3 Risks & mitigations

| Risk | Mitigation |
|---|---|
| Nested `Tabs` not allowed in ArkTS | Artist page uses conditional render for the two sub-tabs (no nested `Tabs`). |
| Search return shapes differ (envelope vs array) | Normalize inside each tab's fetcher; rely on existing `HarmonyHttpClient` envelope unwrap. |
| Token revoked mid-sync | `drain()` checks `authStore.state_.token`; clears queue + warns. |
| Existing P0/P1 architecture drift | This spec re-uses all P0/P1 decisions verbatim; no new patterns introduced. |
| MV `<video>` element not yet wired | MV page renders cover + meta only; playback deferred to P3. |
| Search hot-word list grows unbounded | Deferred to P3 alongside cache UI. |

## 5. Task Breakdown & Timeline

| # | Task | Deliverable | Estimate |
|---|---|---|---|
| T16 | Detail page family | 5 pages wired to APIs + `TrackListItem` reuse + `playerStore.playTrackList` | 2.5 days |
| T18 | SearchPage | Top input + debounce + 4 tabs + search history; new i18n keys | 1.5 days |
| T19 | LikesHistoryService | Local-first writes + sync queue + event bus + 2 hypium unit tests | 1.5 days |
| T20 | P2 close-out | `hvigorw assembleHap` + tests + tag `harmony/p2` + `progress.md` update | 0.5 day |
| **Total** |  |  | **6 days ≈ 1.2 weeks** |

Dependency graph (T16/T18/T19 serialised in ledger, no cross-dependencies; T20 last):

```
T16 Detail family ─┐
T18 Search        ─┼─→ T20 P2 close-out
T19 LikesHistory  ─┘
```

### 5.1 Definition of done

- All 5 detail page files exist, non-empty, reachable from Home/Library/Search entry points.
- `SearchPage.ets` renders four tabs and persists history.
- `LikesHistoryService` singleton exported; PersonalPage / Home subscribe to its events; 2 new hypium unit tests pass.
- `hvigorw assembleHap` + `hvigorw test` succeed.
- Annotated tag `harmony/p2` at the closing commit.
- `progress.md` extended with T16–T20 rows; `Deferred-minor roll-up` unchanged.

## 6. Out-of-Phase Reminders

- T17 Folder browser — P3.
- T20 DownloadManager + offline write — P3.
- T4 deferred minors cleanup — P5 final review.
- ASR / voice / Service Widget / Member / TTS / Plugin / LLM / Scan / Cache UI / Theme / Language / Quality pickers — existing outline.
