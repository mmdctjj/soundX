# 文件数据源（File Sources）设计文档

日期：2026-07-25
状态：已确认

## 背景与目标

api 子项目目前通过环境变量配置媒体路径：`MUSIC_BASE_DIR`、`AUDIO_BOOK_DIR`、`MV_BASE_DIR`（api 服务）和 `TXT_BASE_DIR`（TTS 服务），均支持 `;`/`,` 分隔的多路径，解析逻辑在 `services/api/src/common/path-list.ts`。

目标：把这四个 env 的配置方式迁移到设置页面的输入框配置（数据源版块，位于 WebDAV 数据源之前），覆盖 desktop、mobile、mini 三端，保存后重建文件监听，由用户手动点「同步」触发扫描。

**路径语义**：与 env 完全一致 —— 相对路径以 api 子项目目录为基准解析（服务端路径，不是客户端本地路径）。UI 不提供目录选择器，纯文本输入。

## 关键决策（已与用户确认）

| 决策点 | 结论 |
|---|---|
| 覆盖端 | desktop + mobile + mini（harmony 是空壳工程，不做） |
| 数据模型 | 对齐四个 env：`musicDirs / audiobookDirs / mvDirs / txtDirs` 四个路径数组 |
| 与 env 关系 | env 可选；若 env 已设置则映射（种子）进 DB，之后以 DB 为准 |
| 扫描时机 | 保存只更新配置 + 重建 watcher + 刷新静态挂载；用户点「同步」按钮才扫描 |
| TXT | 包含，三端可配置；TTS Python 服务读共享 SQLite 的同一条设置 |
| 移除路径 | api 无「精简数据」功能 → 被移除路径下的 tracks 软删为 TRASHED，加回并同步后恢复 |

## 架构

存储采用 **SystemSetting JSON** 模式（方案 A），与 `webdav_sources`、`llm_config` 完全同构，无 Prisma migration。

```jsonc
// SystemSetting key = "file_sources"
{
  "musicDirs":     ["./music/music"],
  "audiobookDirs": ["./music/audio"],
  "mvDirs":        ["./music/mv"],
  "txtDirs":       ["./data/novels"]
}
```

### 数据流

```
三端设置页 ──GET/POST /admin/file-sources──> FileSourcesService (api)
                                                │ 保存时
                                                ├─> 重建 chokidar watcher (ImportService.setupWatcher)
                                                ├─> 刷新 /music 静态挂载的动态路径列表
                                                └─> 软删被移除路径下的 tracks (TRASHED)
「同步」按钮 ──POST /admin/file-sources/sync──> ImportService.createTask (复用扫描任务+进度轮询)
TTS list-files ──读共享 SQLite SystemSetting──> txtDirs (env 兜底)
```

## 后端改动（services/api）

### 1. 新增 `FileSourcesService`（`src/services/file-sources.service.ts`）

模板：`webdav-config.service.ts` / `llm-config.service.ts`。

- 类型：`FileSources { musicDirs: string[]; audiobookDirs: string[]; mvDirs: string[]; txtDirs: string[] }`
- `get()`：内存缓存 → DB → 缺省时种子化
- `save(sources)`：归一化（trim、去空、去重、相对路径按 api 目录 resolve 为绝对路径存储或存储原值 —— 与 env 解析保持一致，存原始输入，解析在使用点做）后整体 upsert
- **env 种子**（`buildFromEnv()`）：DB 无记录时，用现有 `resolvePathList` 读 `MUSIC_BASE_DIR / AUDIO_BOOK_DIR / MV_BASE_DIR / TXT_BASE_DIR`，未设置的用现有默认值（`media-paths.ts`）；种子结果落库一次
- 路径解析集中在一个 `resolveDirs()`：把存储值（可为相对/绝对）解析为绝对路径数组，供 watcher/扫描/静态挂载使用

### 2. 新增 `FileSourcesController`（`src/controllers/file-sources.controller.ts`，前缀 `admin/file-sources`，仅 admin）

- `GET /` → `FileSources`（原始输入值，供表单回填）
- `POST /` body 为 `FileSources`，全量替换保存。保存后依次：
  1. 调 `ImportService.setupWatcher(music, audiobook, mv, cache)` 重建监听
  2. 通知静态挂载中间件刷新路径列表（见第 3 点）
  3. 对比新旧路径：被移除路径下的 tracks/mv 软删为 TRASHED（仿 `ImportService.applyWebDavSourceChanges` 的 `findWebDavTracksForSource` 匹配方式，按解析后的绝对路径前缀匹配 `relativePath`）；新加回路径不自动恢复，等「同步」
- `POST /sync` → 以当前 DB 路径调 `ImportService.createTask(...)` 创建扫描任务，返回 `{ taskId }`，前端用现有 `GET /import/task/:id` 轮询进度

### 3. 静态挂载改造（`main.ts`）

现状：bootstrap 时 `for dir of dirs: app.useStaticAssets(dir, { prefix: '/music/' })`，运行时新增路径挂不上。

改为**单个动态中间件**挂在 `/music/` 前缀：请求进来后，从 FileSourcesService 拿当前生效的绝对路径列表，复用 `track.ts` 的 `resolveCandidatePath` 思路逐个 `existsSync`，命中则 `sendFile`，未命中 `next()`。挂载点只需注册一次，路径列表运行时可变。

### 4. 现有读取点改造（env 直读 → FileSourcesService）

- `main.ts` bootstrap：启动扫描/监听的路径入参
- `src/controllers/import.ts`：`POST /import/task` 的 fallback 路径
- `src/services/track.ts` `getFilePath()`：URL → 磁盘反解的 base dirs
- `CACHE_DIR` 仍走 env，不纳入本功能

### 5. TTS 服务（services/tts，仅一处）

`src/web_api/tasks.py` 的 `resolve_txt_dirs()`：先查共享 SQLite（`DATABASE_URL` 指向同一 Prisma DB，见 `src/database/models.py`）的 `SystemSetting` 表 `key='file_sources'`，取 `txtDirs`（相对路径以 api 目录为基准解析）；查不到再 fallback 现有 env 逻辑。api ↔ TTS 之间不新增接口。

## 共享包（packages/services）

新增 `src/file-sources.ts`：

```ts
export interface FileSources { musicDirs: string[]; audiobookDirs: string[]; mvDirs: string[]; txtDirs: string[] }
getFileSources(): Promise<FileSources>
saveFileSources(sources: FileSources): Promise<void>
syncFileSources(): Promise<{ taskId: string }>   // 进度复用现有 getImportTask 轮询
```

mini 端按现有惯例（`apps/mini/src/services/webdav-config.ts` 是本地副本）复制一份 `file-sources.ts` 本地 service。

## 三端 UI

统一交互：
- 入口均在设置页数据源版块，**位于 WebDAV 数据源之前**，仅 admin 可见
- 四个分组卡片：音乐 / 有声书 / MV / TXT 小说，每组为多行路径输入（动态增删行；mini 可用 Textarea 多行，与现有 webdav 页一致）
- 占位提示路径语义：「服务端路径，相对 api 目录或绝对路径，与 docker-compose env 一致」
- 按钮：「保存」（提示保存成功 + 监听已重建）、「同步」（触发扫描，进度条轮询任务直至完成）

| 端 | 新增文件 | 入口改动 |
|---|---|---|
| desktop | `apps/desktop/src/pages/Settings/FileSourcesSettings.tsx`（antd Form + 动态 `Form.List` 或手写行动态增删，风格仿 `WebDavSourcesSettings.tsx`） | `Settings/index.tsx` 的 `sources` tab 中置于 `WebDavSourcesSettings` 上方 |
| mobile | `apps/mobile/app/file-sources.tsx`（RN 手写 StyleSheet + ThemeContext，仿 `webdav-sources.tsx`） | `app/settings.tsx` 数据源区，webdav-sources 入口上方（admin 门控一致） |
| mini | `apps/mini/src/pages/file-sources/index.tsx` + `index.config.ts`（卡片 + 底部弹层编辑，仿 `pages/webdav-sources/`） | `pages/settings/index.tsx` 数据源区入口上方 + `app.config.ts` 注册路由 |

## 错误处理

- 保存时校验：路径去空去重；后端 `resolveDirs` 过滤不存在的目录并过滤 watcher（沿用 `setupWatcher` 现有 `fs.existsSync` 过滤），但**配置原样保存**（目录可能稍后挂载），GET 时附带每个路径的 `exists` 标记供 UI 提示（desktop 用橙色 Tag，mobile/mini 用文字提示）
- 同步任务失败：复用现有任务状态（FAILED）+ message 提示
- TTS 读 DB 失败：静默 fallback env，不阻断 list-files

## 测试

- api：`file-sources.service.spec.ts` —— 种子逻辑（env 有/无）、save/get 往返、相对路径解析；controller 保存后 watcher 重建与软删逻辑用 mock ImportService 验证
- 手工验收：docker-compose 带 env 启动 → 页面看到种子路径；页面改为新路径保存 → 新目录文件可被 watcher add 入库；点同步 → 进度条完成；移除路径 → 对应曲目进回收站

## 不做（YAGNI）

- harmony 端
- 目录选择器 / 文件浏览 picker
- `CACHE_DIR`、cover 目录的页面化
- 自动扫描（保存即扫）、定时同步
- 「精简数据」死链清理功能（独立后续需求）
