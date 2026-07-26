# AudioDock HarmonyOS Client — MVP Design Spec

- Date: 2026-07-26 (updated 2026-07-27 after merge)
- Branch: `feat/hm` (merge of `feat/test` into historical `feat/hm`)
- Author: brainstorming output
- Status: design approved, awaiting implementation plan

## 1. Goal

Reimplement the AudioDock mobile (React Native + Expo) feature set as a **native HarmonyOS application**, end-to-end 1:1 for the listening-and-management surface, but phased. MVP (this spec) covers all core listening flows; sync session, voice assistant, and Xiao-Ai push are deferred to v1.1.

## 2. Scope (MVP)

### 2.1 In scope

- Server selection + login + register + forgot password + scan QR
- Home / Library / Personal tabs + 5 sub-tabs in Library
- Album / Artist / Playlist / Collection / MV / Folder detail pages
- Search (text + ASR voice entry)
- Settings: theme / language / playback quality / cache / account / logout / car mode
- Source management: AudioDock / Subsonic / Emby, internal↔external pairs
- WebDAV source CRUD + sync trigger
- Plugin center (metadata plugins)
- LLM config + TTS config
- Member/Plus: phone+code login, benefits, H5 payment redirect, VIP status, internal-test redemption
- TTS create + tasks
- Task center (import + TTS unified)
- Player: AVPlayer + AVPlaySession + lock-screen + notification bar + lyrics + speed + sleep timer + skip intro/outro + per-track quality
- Offline download/cache
- Service Widget (Harmony card)
- Theme system: light / dark / festive
- i18n: zh-CN / en (follow-system)

### 2.2 Out of scope (deferred to v1.1+)

- Sync session (cross-device listen together) — WS layer in place, UI deferred
- Voice assistant (Squirrel) — ASR plumbing ready, mascot/UI deferred
- Xiao-Ai push — API client stub only
- Apple IAP, WeChat Pay, Alipay native SDK — replaced by H5 redirect via system browser
- Android-style home-screen widget animation parity — Harmony widget uses Service Widget paradigm
- CarPlay / Android Auto — Harmony uses its own distributed audio

## 3. Architectural Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Native HarmonyOS implementation** (ArkTS strict) | Per user; no `react-native-track-player` reuse |
| 2 | Build on the merged `feat/hm` scaffold | Per user; avoid re-creating 12 pages |
| 3 | **`AVPlayer` + `AVPlaySession`** for audio | Per user; standard Harmony path with lock-screen support |
| 4 | **Standalone ArkTS API layer** in `features/network` | Cannot reuse `@soundx/services` (axios + Node); match backend contract instead |
| 5 | **Stage model**, separate `EntryAbility` + `PlayerServiceAbility` (Service with `backgroundModes: audio`) | Lock-screen and background playback require a Service ability |
| 6 | HAR-ize shared features (`features/{network,storage,player,ui,i18n,socket}`) | Future TV/watch reuse |
| 7 | State: class-based singletons + EventBus, persisted via PreferencesStore | Replace mobile's React Context paradigm |
| 8 | Storage: PreferencesStore (KV) + RdbStore (history/likes) + FileStore (cache) | Match mobile's split: AsyncStorage = KV; on-device history/likes need RDB; large blobs need files |
| 9 | Theme tokens central in `features/ui/theme` | Match mobile design system; 3 themes |
| 10 | i18n JSONs copied into `features/i18n/src/main/resources/locales/` (do not consume `@soundx/i18e`) | Node-locale detector unavailable in ArkTS |
| 11 | WeChat Pay / Alipay: open `www.audiodock.cn/pay/...` H5 page in Web Component + system browser fallback | No native SDK path without partner approval; H5 is the user-approved fallback |
| 12 | HarmonyOS **Service Widget** (Form) for home-screen widget | Native Harmony primitive; one MVP card, expand later |

## 4. Repository Layout

```
apps/harmony/
├── AppScope/                              # 应用配置
├── build-profile.json5
├── oh-package.json5                       # 顶层依赖(空)
├── common/audiodock_common/               # 通用 utils/logger/types
├── features/
│   ├── network/                           # HarmonyHttpClient + ApiService
│   ├── storage/                           # PreferencesStore + RdbStore + FileCache
│   ├── player/                            # IAudioPlayer + AVPlayerBackend
│   ├── ui/                                # Theme tokens + CommonButton/NavBar/...
│   ├── i18n/                              # 翻译资源 + t() helper
│   └── socket/                            # WebSocket 包装
└── products/entry/                        # 宿主 entry
    ├── build-profile.json5
    ├── oh-package.json5
    └── src/main/
        ├── module.json5                   # abilities + permissions
        ├── resources/
        └── ets/
            ├── entryability/
            │   ├── EntryAbility.ets       # 应用入口
            │   └── PlayerServiceAbility.ets  # 后台音频服务
            ├── widget/EntryFormWidget.ets # Service Widget
            ├── pages/                     # 38 个页面
            ├── components/                # 30 个公共组件
            ├── context/                   # 6 个状态容器
            ├── services/                  # 业务服务
            ├── store/                     # 共享单例
            └── utils/
```

Module dependency direction: `products/entry → features/* → common/audiodock_common`. Features may depend on other features; `common` depends on nothing.

## 5. Data Layer

### 5.1 Storage split

| Data | Store | Format |
|---|---|---|
| Token, user, device, settings | `PreferencesStore` (KV) | One key per logical record; settings JSON-serialized |
| Track/album/audiobook history & likes | `RdbStore` (SQLite) | Tables in §5.3 |
| Audio cache, cover cache, lyrics cache, TTS preview | `FileStore` | `filesDir/{audio,cover,lyrics,tts}_cache/...` |
| App state in memory | `EventBus` singletons | Reactive observer |

### 5.2 PreferencesStore keys (match mobile)

```
serverAddress
serverAddress_<sourceType>
selectedSourceType
token_<url>
user_<url>
device_<url>
creds_<sourceType>_<url>
sourceConfig_<sourceType>           (JSON array)
mobile-settings                    (full settings JSON)
app_settings                       (alias of mobile-settings)
theme                              ('light' | 'dark' | 'festive')
app_language                       ('system' | 'zh-CN' | 'en')
contentMode                        ('MUSIC' | 'AUDIOBOOK')
playMode                           ('SEQUENCE' | 'LOOP_LIST' | 'LOOP_SINGLE' | 'SHUFFLE')
playerPlaybackMode
playerRadioPlaybackMode
skipIntroDuration                   (number, default 0)
skipOutroDuration                   (number, default 0)
plus_token
plus_user_id
plus_vip_status
plus_vip_data
plus_vip_updated_at
widget_cache
cached_track_meta
ignored_version
```

### 5.3 RdbStore tables

```
CREATE TABLE track_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id TEXT NOT NULL,
  progress INTEGER NOT NULL,
  played_at INTEGER NOT NULL,
  source TEXT,
  UNIQUE(track_id, source)
);

CREATE TABLE album_like (
  album_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE track_like (
  track_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE audiobook_like (
  audiobook_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE downloaded_track (
  track_id TEXT PRIMARY KEY,
  local_path TEXT NOT NULL,
  size INTEGER NOT NULL,
  quality TEXT NOT NULL,
  completed_at INTEGER NOT NULL
);

CREATE TABLE search_history (
  keyword TEXT PRIMARY KEY,
  last_used_at INTEGER NOT NULL
);
```

Sync strategy: on app foreground, fetch latest 200 from server, merge into local; writes go local-first then async POST to server.

### 5.4 File cache

Under `getContext().filesDir`:

```
audio_cache/<trackId>.<ext>
cover_cache/<djb2_url_hash>.<ext>
lyrics_cache/<trackId>.json
tts_preview/<voice>_<hash>.mp3
```

`FileCache.downloadAsync(url, dest, onProgress)` uses `.tmp` → atomic rename. Same-URL in-flight requests are de-duplicated via in-memory map.

### 5.5 HTTP client (`features/network/HarmonyHttpClient`)

Wraps `@ohos.net.http.HttpRequest`:

- `request<T>(config: RequestConfig): Promise<HttpResponse<T>>`
- Request interceptor: inject `Authorization: Bearer <token>` (read from PreferencesStore for current baseURL)
- Response interceptor: 401 → call `handleUnauthorized()`; non-2xx → throw `HttpError` with backend `message`
- 30s default timeout; GET retries 1×; POST no retry
- `setBaseURL(url)` mutates default

### 5.6 API service (`features/network/api`)

One file per backend domain. List of files mirrors the backend controllers:

```
auth.ts, user.ts, track.ts, album.ts, artist.ts,
playlist.ts, collection.ts, mv.ts, folder.ts,
import.ts, webdav.ts, metadataPlugins.ts,
search.ts, searchRecord.ts, llm.ts, llmConfig.ts,
tts.ts, ttsConfig.ts, asr.ts, scanLogin.ts,
vip.ts, plus.ts, trackHistory.ts, albumHistory.ts,
trackLike.ts, audiobookLike.ts, admin.ts,
taskCenter.ts, playbackQuality.ts, playback.ts,
mi.ts (stub — returns "not supported on Harmony")
```

Each exports typed functions matching mobile's `@soundx/services` signatures.

### 5.7 WebSocket (`features/socket`)

Wraps `@ohos.net.WebSocket.WebSocket`:

- `HarmonySocketService` with `connect({url, token, userId, deviceName})` / `disconnect()` / `on(event, cb)` / `emit(event, payload)`
- Reconnect: exponential backoff 1s/2s/4s/8s, cap 30s
- Event names match mobile: `invite`, `respond_invite`, `sync_command`, `player_left`, `sync_session_started`, `participants_update`
- Plus WS endpoint: `https://www.audiodock.cn/ws` (used for scan-login + payment notify)

## 6. Player Subsystem

### 6.1 Architecture

```
┌────────────────────────────────────────────────┐
│ UI (PlayerPage.ets, MiniPlayer.ets)             │
│   - subscribe PlayerStore                       │
│   - dispatch play/pause/next/seek/quality       │
└────────────────────────────────────────────────┘
                ↑ observe
┌────────────────────────────────────────────────┐
│ PlayerStore (singleton + EventBus)              │
│   queue / currentIndex / state / progress       │
│   isPlaying / playMode / radioMode / skipIntro  │
│   lyrics / quality / syncSession                │
└────────────────────────────────────────────────┘
                ↑ bind
┌────────────────────────────────────────────────┐
│ PlayerServiceAbility (Service, backgroundModes) │
│   AVPlaySession + MediaSession + Notification  │
└────────────────────────────────────────────────┘
                ↑ stream URL
┌────────────────────────────────────────────────┐
│ AudioBackend (`features/player/avplayer`)       │
│   AVPlayer wrapping + event emit                │
│   cache hit first / remote fallback             │
│   speed / skip / error retry                    │
└────────────────────────────────────────────────┘
```

### 6.2 Player abstraction

```typescript
// features/player/IAudioPlayer.ets
interface IAudioPlayer {
  load(url: string, headers?: Record<string, string>): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seek(position: number): Promise<void>;
  setSpeed(speed: number): Promise<void>;
  setVolume(v: number): Promise<void>;
  on(event: 'timeUpdate'|'ended'|'error'|'stateChange'|'bufferingUpdate', cb: Function): void;
  off(event: string, cb?: Function): void;
}
```

`AVPlayerBackend` is the implementation, using `media.createAVPlayer()`. Future swap to OhosMediaEngine doesn't touch consumers.

### 6.3 Queue model

```typescript
class PlayerStore {
  queue: Track[];
  currentIndex: number;
  shuffleSeed: number;
  playMode: 'SEQUENCE'|'LOOP_LIST'|'LOOP_SINGLE'|'SHUFFLE';
  radioMode: boolean;

  playTrack(track: Track): void;
  playTrackList(tracks: Track[], startIndex: number): void;
  playNext(): void;
  playPrevious(): void;
  removeAt(index: number): void;
  clear(): void;
}
```

### 6.4 Audio quality

- `SettingsStore.internalPlaybackQuality` / `externalPlaybackQuality`
- Resolve URL via `/track/{id}/playback-qualities` profile; choose URL with `?quality=<level>` query
- Cache-first: if `audio_cache/<id>.<ext>` exists, use file URI

### 6.5 Lyrics

- `getLyrics(trackId)` → LRC text via API
- `LRCParser.parse(text)` → `LyricLine[]`
- `getActiveLyricLine(currentMs)` binary search on `time`
- Font-size modal persists preference

### 6.6 Lock-screen + Notification + MediaSession

- `AVPlaySession` bound to `PlayerServiceAbility`
- Notification: `NotificationRequest` with `id`, `largeIcon` (cover), `title`, `text`, `actionButtons` (play/pause/next/prev)
- Remote control: Bluetooth headset / car / USB Audio intents
- Audio focus: `pauseOnAudioFocusChange`, resume on regain

### 6.7 Background keep-alive

- `PlayerServiceAbility` registered with `backgroundModes: ['audio']`
- Long-running media session
- `keepBackgroundRunning()` while playing
- Release on pause + timeout / queue empty

### 6.8 Sync session (MVP simplified)

- Receive-only: `sync_command` events are honored (pause, seek, next, prev)
- V1.1 will add: invite UI, participant list, "request sync" action

## 7. State Management

Six class-based singletons in `entry/ets/context/`:

| Store | Owns |
|---|---|
| `AuthStore` | user / token / sourceType / plusToken / switchServer |
| `SettingsStore` | theme / language / quality / cache / carMode / EQ / experienceProgram |
| `PlayerStore` | queue / progress / mode / syncSession / lyrics |
| `TaskStore` | merged import + TTS tasks |
| `SyncStore` | sync session participants (MVP simplified) |
| `PlayModeStore` | MUSIC / AUDIOBOOK |

Each store: `subscribe(listener)` / `setState(partial)` / `persist()`; auto-persists on state change.

## 8. Page & Component Inventory

### 8.1 Routes (38)

```
/                          pages/Index.ets              # 启动判断
/main                      pages/Main.ets               # Tab 容器
/home                      pages/Home.ets               # 推荐 + 最新
/library                   pages/Library.ets            # 5 种 Tab
/personal                  pages/Personal.ets           # 我的
/player                    pages/Player.ets             # 完整播放器
/search                    pages/Search.ets             # 搜索
/settings                  pages/Settings.ets           # 设置
/admin                     pages/Admin.ets              # 用户管理
/language                  pages/Language.ets           # 语言选择
/playback-quality          pages/PlaybackQuality.ets    # 音质选择
/product-updates           pages/ProductUpdates.ets     # 版本更新
/member-benefits           pages/MemberBenefits.ets     # VIP 套餐
/member-detail             pages/MemberDetail.ets       # VIP 状态
/member-payment-success    pages/MemberPaymentSuccess.ets
/member-login              pages/MemberLogin.ets        # Plus 手机登录
/forgot-password           pages/ForgotPassword.ets     # 找回密码
/source-manage             pages/SourceManage.ets       # 服务器管理
/scan                      pages/Scan.ets               # QR 扫码
/scan-confirm              pages/ScanConfirm.ets        # 等待确认
/plugin-center             pages/PluginCenter.ets       # 元数据插件
/webdav-sources            pages/WebdavSources.ets      # WebDAV CRUD
/llm-config                pages/LLMConfig.ets          # LLM 配置
/tts-config                pages/TtsConfig.ets          # TTS 配置
/tts/create                pages/TtsCreate.ets          # 创建 TTS
/tts/tasks                 pages/TtsTasks.ets           # TTS 任务
/task-center               pages/TaskCenter.ets         # 任务中心
/album/:id                 pages/AlbumDetail.ets        # 专辑详情
/artist/:id                pages/ArtistDetail.ets       # 艺人详情
/collection/:id            pages/CollectionDetail.ets   # 有声书合集
/playlist/:id              pages/PlaylistDetail.ets     # 歌单详情
/mv/:id                    pages/MVDetail.ets           # MV 播放
/folder                    pages/FolderIndex.ets        # 目录根
/folder/:id                pages/FolderDetail.ets       # 目录内容
/source-select             pages/SourceSelect.ets       # 服务器类型
/login                     pages/Login.ets              # 登录
/login-form                pages/LoginForm.ets          # 登录表单
/sign-up                   pages/SignUp.ets             # 注册
```

### 8.2 Components (~30)

Common: `CommonButton`, `CommonNavBar`, `LoadingView`, `EmptyView`, `SkeletonBlock`, `MarqueeText`, `CachedImage`, `CachedAvatar`.

Player: `AlbumCover`, `ProgressSlider`, `FullLyricsView`, `LyricsFontSizeModal`, `SleepTimerModal`, `EqualizerModal` (placeholder), `QualityModal`, `PlayerMoreModal`, `MiniPlayer`.

List: `TrackListItem`, `TrackMoreModal`, `AlbumMoreModal`, `ArtistMoreModal`, `FolderMoreModal`, `PlaylistModal`, `AddToPlaylistModal`, `CollectionSelectModal`.

VIP: `MembershipCard`, `CouponCard`, `PaymentMethodSheet` (H5 entry).

Sources: `SourceItem`, `WebDAVForm`.

Sync: `SyncModal`, `InviteNotification`.

Nav: `GlobalBottomBar`, `FloatingActionButtons`.

Updates: `UpdateModal`, `PlaybackNotification`.

### 8.3 Services (entry/ets/services/)

```
playbackService.ts        # 转发 AVPlayer 事件到 PlayerStore
downloadManager.ts        # 批量下载
cache.ts                  # 缓存管理聚合
payments.ts               # H5 支付跳转
tracking.ts               # plusTrackEvent
socket.ts                 # 包装 features/socket
trackResolver.ts          # 解析播放 URL(含 quality)
trackQuality.ts           # 播放音质档位
lyrics.ts                 # LRC 解析
updateUtils.ts            # 版本检查 + 系统下载
```

## 9. Theme, i18n, Errors

### 9.1 Theme

3 sets: `light`, `dark`, `festive` (CNY red/gold). Tokens for color/spacing/typography/radius/shadow stored as TS objects in `features/ui/theme/`. Switch animates 200ms.

### 9.2 i18n

JSONs copied from `@soundx/i18e` to `features/i18n/src/main/resources/locales/{en,zh-CN}.json`. `t(key, params)` helper resolves with system-language fallback via `ohos.i18n.System.getLanguage()`.

### 9.3 Errors

- Global `ErrorBus` shows errors via toast / banner
- HTTP errors surfaced from response interceptor with backend `message`
- Player errors: AVPlayer `error` event → toast + auto-retry 1× → skip to next on persistent failure
- Crash logging via `hilog` + optional `plusTrackEvent({feature:'crash', ...})`

## 10. Permissions (`module.json5`)

```json
{
  "abilities": [
    {"name":"EntryAbility","type":"page"},
    {"name":"PlayerServiceAbility","type":"service","backgroundModes":["audio"]}
  ],
  "extensionAbilities": [
    {"name":"EntryFormWidget","type":"form"}
  ],
  "requestPermissions": [
    "ohos.permission.INTERNET",
    "ohos.permission.GET_NETWORK_INFO",
    "ohos.permission.WAKE_LOCK",
    "ohos.permission.KEEP_BACKGROUND_RUNNING",
    "ohos.permission.MEDIA_LOCATION",
    "ohos.permission.READ_MEDIA",
    "ohos.permission.WRITE_MEDIA",
    "ohos.permission.CAMERA",
    "ohos.permission.MICROPHONE",
    "ohos.permission.INSTALL_UNKNOWN_APPS"
  ]
}
```

## 11. Phased Plan

| Phase | Weeks | Deliverable |
|---|---|---|
| **P0 基建** | 1.5 | feat/hm scaffold migrated; features/{network,storage,ui,i18n} ready; 12 shell pages refresh |
| **P1 播放器内核** | 2 | `IAudioPlayer` + `AVPlayerBackend`; `PlayerServiceAbility`; lock-screen + notification; lyrics + speed |
| **P2 完整播放链路** | 1.5 | Album/Artist/Playlist/Collection/MV details; Search; likes/history; download |
| **P3 数据源 + 设置** | 1 | WebDAV CRUD; theme/language/quality settings; cache management |
| **P4 高级功能** | 1 | TTS; TaskCenter; PluginCenter; LLM config; Member (H5); Scan; Widget |
| **P5 打磨** | 1 | Performance; error handling; accessibility; internal dogfood |
| **Total** | **8 weeks** | v1.0 shippable |

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `AVPlaySession` API changes between API 12 and 19 | Pin `compileSdkVersion: 6.0.2(22)`, `targetSdkVersion: 5.1.1(19)`; test on real device at API 12 + 19 |
| WeChat Pay / Alipay absent | H5 redirect via system browser; document limitation in release notes |
| Service Widget API differences vs Android App Widget | Use the simplest 2x2 card; iterate later |
| Prisma `packages/db/generated/*` drift | Add `pnpm db:generate` to CI; ignore in git if regenerated often |
| Server contract drift between mobile and Harmony client | API client is the source of truth; regenerate types from `api.json` Swagger when possible |
| Background audio consumption | Aggressive `keepBackgroundRunning` only when actually playing |

## 13. Success Criteria

- App installs and runs on HarmonyOS 5.0+ phone and tablet
- User can: configure server → login → browse home/library → play track → see lyrics → control from lock screen → download for offline
- Settings, cache management, language, theme all work
- All 38 routes reachable; v1.1-deferred items show "coming soon" placeholder
- No regressions on mobile / desktop / mini builds
- App size < 50MB installed

## 14. References

- Mobile app inventory (from earlier Explore agent): `apps/mobile/`
- Existing design doc: `docs/superpowers/specs/2026-07-25-file-data-sources-design.md`
- Historical feat/hm plan: `apps/harmony/ARCHITECTURE_PLAN.md` (in merge commit `f9df8d1b`)
- API source-of-truth: `services/api/src/controllers/*.ts` + runtime Swagger at `/api`