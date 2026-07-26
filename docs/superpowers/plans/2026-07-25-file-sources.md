# 文件数据源（File Sources）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 api 子项目（NestJS + Prisma SQLite）落地"文件数据源"配置（与现有 4 个 env 等价的四组多路径），并在 desktop、mobile、mini 三端的设置页数据源版块提供增删改查 UI，位于 WebDAV 数据源之前。

**Architecture:** 仿 `WebDavConfigService` 的 SystemSetting JSON 模式（key=`file_sources`），新增 `FileSourcesService` + `FileSourcesController` + 共享 SQLite 给 TTS Python 服务读的旁路；将 `main.ts` 中启动期的 `useStaticAssets` 改为运行时可刷新的动态中间件；保存即重建 chokidar 监听并软删被移除路径下的曲目，扫描由用户点「同步」触发。

**Tech Stack:** NestJS 11 + Prisma + SQLite (api), chokidar 4, Python FastAPI + SQLModel (tts), React + antd (desktop), Expo/RN (mobile), Taro (mini), 共享 `packages/services`。

## Global Constraints

- 路径语义：与 env 一致，相对路径以 api 子项目根目录（`process.cwd()` 或 `path.resolve`）为基准；绝对路径保持不变；解析沿用 `services/api/src/common/path-list.ts` 的 `resolvePathList`（分号/逗号分隔），storage 存原始输入字符串
- TTS TXT 路径通过共享 `SystemSetting` 读取（与 api 同库），api 不新增到 TTS 的接口
- 所有 controller 路由前缀 `admin/file-sources`，仅 admin 可见（仿 `WebDavSourcesController.checkAdmin` 模式）
- API 响应体统一 `{ code: 200, message: 'success', data: ... }` / 错误 `{ code, message }`
- 三端 i18n key 新增走现有 `i18n.ts`（desktop）、`react-i18next`（mobile/mini）
- mini 端服务层按现有惯例复制一份本地副本（与 `apps/mini/src/services/webdav-config.ts` 同模式）
- harmony 端（空壳工程）不做
- `CACHE_DIR` 仍走 env，不纳入本功能

---

## File Structure

### 新增
- `services/api/src/services/file-sources.service.ts` —— 读/写/缓存/种子/env 解析
- `services/api/src/controllers/file-sources.controller.ts` —— `GET /`、`POST /`、`POST /sync`
- `services/api/src/middleware/dynamic-static.middleware.ts` —— 运行时刷新 `/music/*`、`/audio/*` 静态服务
- `packages/services/src/file-sources.ts` —— 共享前端 API 封装
- `apps/desktop/src/pages/Settings/FileSourcesSettings.tsx`
- `apps/mobile/app/file-sources.tsx`
- `apps/mini/src/pages/file-sources/index.tsx` + `index.config.ts`
- `apps/mini/src/services/file-sources.ts`

### 修改
- `services/api/src/main.ts` —— 用动态中间件替换 `useStaticAssets`；启动扫描/监听入参改读 FileSourcesService
- `services/api/src/app.module.ts` —— 注册新 controller 和 service（注意 WebDavConfigService 已注册，仿它）
- `services/api/src/services/track.ts` —— `getFilePath()` 改读 FileSourcesService
- `services/api/src/services/import.ts` —— `applyFileSourcesChanges(prev, next)` 新增（仿 `applyWebDavSourceChanges` 路径前缀匹配），按 `relativePath` 或 `track.path` 前缀
- `services/api/src/controllers/import.ts` —— fallback 改读 FileSourcesService
- `services/tts/src/web_api/tasks.py` —— `resolve_txt_dirs()` 先查 SystemSetting 再 fallback env
- `packages/services/src/index.ts` —— 导出新模块
- `apps/desktop/src/pages/Settings/index.tsx` —— sources tab 内新增 FileSourcesSettings，置于 WebDavSourcesSettings 上方
- `apps/mobile/app/settings.tsx` —— 数据源区入口，置于 webdav-sources 之前
- `apps/mini/src/pages/settings/index.tsx` —— 同上
- 各端 i18n 文件 —— 新增 `fileSources*`、`filePath*` key

### 复用
- `services/api/src/common/path-list.ts` —— `resolvePathList`
- `services/api/src/common/media-paths.ts` —— `DEFAULT_*`
- `services/api/src/services/import.ts` —— `setupWatcher` / `createTask` / `getTask`
- `packages/services/src/request.ts` —— axios 实例

---

## Task 1: api `FileSourcesService`（核心数据层）

**Files:**
- Create: `services/api/src/services/file-sources.service.ts`
- Test: `services/api/src/services/file-sources.service.spec.ts`

**Interfaces:**
- Consumes: `SystemSetting` (Prisma), `resolvePathList` (path-list.ts), `DEFAULT_*_DIR` (media-paths.ts)
- Produces:
  - `FileSources { musicDirs, audiobookDirs, mvDirs, txtDirs: string[] }`（原始输入）
  - `ResolvedFileSources` `{ musicDirs, audiobookDirs, mvDirs, txtDirs: string[] }`（解析为绝对路径）
  - `FileSourcesView { sources: FileSources; exists: Record<keyof FileSources, boolean[]> }`
  - `getSources(): Promise<FileSourcesView>`
  - `getResolved(): Promise<ResolvedFileSources>`
  - `save(sources: FileSources): Promise<void>`

- [ ] **Step 1: 写失败的测试**

```ts
// services/api/src/services/file-sources.service.spec.ts
import { FileSourcesService } from './file-sources.service';

describe('FileSourcesService', () => {
  // 不打 DB，纯单元
  it('buildFromEnv reads env when present', () => {
    process.env.MUSIC_BASE_DIR = '/tmp/m1;/tmp/m2';
    process.env.AUDIO_BOOK_DIR = '';
    const svc = new FileSourcesService();
    const r = (svc as any).buildFromEnv();
    expect(r.musicDirs).toEqual(['/tmp/m1;/tmp/m2']); // 原始输入，未解析
    expect(r.audiobookDirs).toEqual([]);
  });

  it('buildFromEnv falls back to defaults when env missing', () => {
    delete process.env.MUSIC_BASE_DIR;
    delete process.env.AUDIO_BOOK_DIR;
    delete process.env.MV_BASE_DIR;
    delete process.env.TXT_BASE_DIR;
    const svc = new FileSourcesService();
    const r = (svc as any).buildFromEnv();
    expect(r.musicDirs).toEqual(['./music/music']);
    expect(r.audiobookDirs).toEqual(['./music/audio']);
    expect(r.mvDirs).toEqual(['./music/mv']);
    expect(r.txtDirs).toEqual([]); // TTS 端无 DEFAULT，走 []
  });

  it('normalize trims, dedupes and drops empty entries', () => {
    const svc = new FileSourcesService();
    const r = (svc as any).normalize({
      musicDirs: ['  /a', '/a', '', ' /b'],
      audiobookDirs: [],
      mvDirs: [],
      txtDirs: [],
    });
    expect(r.musicDirs).toEqual(['/a', '/b']);
  });

  it('resolveDirs returns absolute paths via path.resolve', () => {
    const svc = new FileSourcesService();
    const r = (svc as any).resolveDirs({
      musicDirs: ['./relative'],
      audiobookDirs: [],
      mvDirs: [],
      txtDirs: [],
    });
    expect(r.musicDirs[0]).toMatch(/[/\\]relative$/);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd services/api && npx jest src/services/file-sources.service.spec.ts`
Expected: FAIL — `FileSourcesService` 尚未定义

- [ ] **Step 3: 实现 `FileSourcesService`**

```ts
// services/api/src/services/file-sources.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@soundx/db';
import * as path from 'path';
import {
  DEFAULT_AUDIOBOOK_DIR,
  DEFAULT_MUSIC_DIR,
  DEFAULT_MV_DIR,
} from '../common/media-paths';
import { resolvePathList, splitPathList } from '../common/path-list';

const SETTING_KEY = 'file_sources';

export interface FileSources {
  musicDirs: string[];
  audiobookDirs: string[];
  mvDirs: string[];
  txtDirs: string[];
}

export interface ResolvedFileSources {
  musicDirs: string[];
  audiobookDirs: string[];
  mvDirs: string[];
  txtDirs: string[];
}

export interface FileSourcesView {
  sources: FileSources;
  exists: Record<keyof FileSources, boolean[]>;
}

const KEYS: (keyof FileSources)[] = ['musicDirs', 'audiobookDirs', 'mvDirs', 'txtDirs'];

@Injectable()
export class FileSourcesService implements OnModuleInit {
  private readonly logger = new Logger(FileSourcesService.name);
  private prisma: PrismaClient;
  private cache: FileSources | null = null;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async onModuleInit() {
    const fromDb = await this.readFromDb();
    if (fromDb) {
      this.cache = fromDb;
      return;
    }
    const fromEnv = this.buildFromEnv();
    this.logger.log(`No file_sources in DB; seeding from env/defaults.`);
    await this.writeToDb(fromEnv);
    this.cache = fromEnv;
  }

  async getSources(): Promise<FileSourcesView> {
    if (this.cache === null) {
      this.cache = (await this.readFromDb()) ?? this.buildFromEnv();
    }
    const sources = this.clone(this.cache);
    const resolved = this.resolveDirs(sources);
    const fs = require('fs') as typeof import('fs');
    const exists: Record<keyof FileSources, boolean[]> = {
      musicDirs: resolved.musicDirs.map((d) => fs.existsSync(d)),
      audiobookDirs: resolved.audiobookDirs.map((d) => fs.existsSync(d)),
      mvDirs: resolved.mvDirs.map((d) => fs.existsSync(d)),
      txtDirs: resolved.txtDirs.map((d) => fs.existsSync(d)),
    };
    return { sources, exists };
  }

  async getResolved(): Promise<ResolvedFileSources> {
    const { sources } = await this.getSources();
    return this.resolveDirs(sources);
  }

  async save(sources: FileSources): Promise<void> {
    const normalized = this.normalize(sources);
    await this.writeToDb(normalized);
    this.cache = normalized;
  }

  /** Get previous snapshot before save, used by controller to detect removals. */
  async snapshot(): Promise<FileSources> {
    if (this.cache === null) {
      this.cache = (await this.readFromDb()) ?? this.buildFromEnv();
    }
    return this.clone(this.cache);
  }

  private normalize(input: FileSources): FileSources {
    const result: FileSources = { musicDirs: [], audiobookDirs: [], mvDirs: [], txtDirs: [] };
    for (const key of KEYS) {
      const raw = input[key] ?? [];
      const cleaned = Array.from(
        new Set(
          raw
            .flatMap((v) => splitPathList(v))
            .map((v) => v.trim())
            .filter(Boolean),
        ),
      );
      result[key] = cleaned;
    }
    return result;
  }

  private resolveDirs(sources: FileSources): ResolvedFileSources {
    return {
      musicDirs: sources.musicDirs.map((d) => path.resolve(d)),
      audiobookDirs: sources.audiobookDirs.map((d) => path.resolve(d)),
      mvDirs: sources.mvDirs.map((d) => path.resolve(d)),
      txtDirs: sources.txtDirs.map((d) => path.resolve(d)),
    };
  }

  private buildFromEnv(): FileSources {
    return {
      musicDirs: this.envOrDefault('MUSIC_BASE_DIR', DEFAULT_MUSIC_DIR),
      audiobookDirs: this.envOrDefault('AUDIO_BOOK_DIR', DEFAULT_AUDIOBOOK_DIR),
      mvDirs: this.envOrDefault('MV_BASE_DIR', DEFAULT_MV_DIR),
      txtDirs: process.env.TXT_BASE_DIR
        ? resolvePathList(process.env.TXT_BASE_DIR, './').map((p) => this.relativeFromAbsolute(p))
        : [],
    };
  }

  private envOrDefault(envKey: string, fallback: string): string[] {
    const raw = process.env[envKey];
    if (!raw) return [fallback];
    return resolvePathList(raw, fallback).map((p) => this.relativeFromAbsolute(p));
  }

  /** Convert a path.resolve'd absolute path back to the user's original input form if it was relative. */
  private relativeFromAbsolute(abs: string): string {
    const cwd = process.cwd();
    if (abs === cwd) return '.';
    if (abs.startsWith(cwd + path.sep)) return '.' + abs.slice(cwd.length);
    return abs;
  }

  private clone(s: FileSources): FileSources {
    return {
      musicDirs: [...s.musicDirs],
      audiobookDirs: [...s.audiobookDirs],
      mvDirs: [...s.mvDirs],
      txtDirs: [...s.txtDirs],
    };
  }

  private async readFromDb(): Promise<FileSources | null> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
    if (!row) return null;
    try {
      const parsed = JSON.parse(row.value);
      if (!parsed || typeof parsed !== 'object') return null;
      return this.normalize({
        musicDirs: parsed.musicDirs ?? [],
        audiobookDirs: parsed.audiobookDirs ?? [],
        mvDirs: parsed.mvDirs ?? [],
        txtDirs: parsed.txtDirs ?? [],
      });
    } catch {
      this.logger.warn(`Failed to parse ${SETTING_KEY}; ignoring.`);
      return null;
    }
  }

  private async writeToDb(s: FileSources): Promise<void> {
    const value = JSON.stringify(this.normalize(s));
    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value },
      create: { key: SETTING_KEY, value },
    });
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd services/api && npx jest src/services/file-sources.service.spec.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add services/api/src/services/file-sources.service.ts services/api/src/services/file-sources.service.spec.ts
git commit -m "feat(api): add FileSourcesService with env seeding"
```

---

## Task 2: api `FileSourcesController` + 移除路径软删逻辑

**Files:**
- Create: `services/api/src/controllers/file-sources.controller.ts`
- Modify: `services/api/src/services/import.ts:413`（在 `applyWebDavSourceChanges` 旁新增 `applyFileSourcesChanges`）
- Modify: `services/api/src/app.module.ts`（注册 provider/controller）

**Interfaces:**
- Consumes: `FileSourcesService`, `ImportService.createTask`, `getTask`
- Produces:
  - `GET /admin/file-sources` → `FileSourcesView`
  - `POST /admin/file-sources` body `FileSources` → `FileSourcesView`（保存 + 重建 watcher + 软删）
  - `POST /admin/file-sources/sync` → `{ taskId }`

- [ ] **Step 1: 在 import.ts 新增 `applyFileSourcesChanges`**

在 `services/api/src/services/import.ts` 文件末尾（约 `applyWebDavSourceChanges` 旁）添加：

```ts
/**
 * React to file source list changes (called after file_sources are saved):
 * - path removed from any category → soft-trash its tracks (TRASHED).
 *   Re-adding the path and syncing later restores them via TRASHED → ACTIVE
 *   match on relativePath prefix.
 */
@LogMethod()
async applyFileSourcesChanges(
  previous: { musicDirs: string[]; audiobookDirs: string[]; mvDirs: string[] },
  current: { musicDirs: string[]; audiobookDirs: string[]; mvDirs: string[] },
): Promise<void> {
  const prevResolved = {
    musicDirs: previous.musicDirs.map((d) => path.resolve(d)),
    audiobookDirs: previous.audiobookDirs.map((d) => path.resolve(d)),
    mvDirs: previous.mvDirs.map((d) => path.resolve(d)),
  };
  const nextResolved = {
    musicDirs: current.musicDirs.map((d) => path.resolve(d)),
    audiobookDirs: current.audiobookDirs.map((d) => path.resolve(d)),
    mvDirs: current.mvDirs.map((d) => path.resolve(d)),
  };
  const removed = [
    ...prevResolved.musicDirs.filter((d) => !nextResolved.musicDirs.includes(d)),
    ...prevResolved.audiobookDirs.filter((d) => !nextResolved.audiobookDirs.includes(d)),
    ...prevResolved.mvDirs.filter((d) => !nextResolved.mvDirs.includes(d)),
  ];
  if (removed.length === 0) return;

  await this.normalizeLegacyDisabledTracks();

  // trash any ACTIVE track whose stored absolute file lives under a removed dir.
  // relativePath is the in-DB relative path from the base; we resolve relative to every
  // removed dir to find the on-disk absolute path.
  const candidates = await this.prisma.track.findMany({
    where: { status: FileStatus.ACTIVE },
    select: { id: true, relativePath: true },
  });
  const fs = require('fs') as typeof import('fs');
  const ids: number[] = [];
  for (const t of candidates) {
    if (!t.relativePath) continue;
    for (const base of removed) {
      const abs = path.resolve(base, t.relativePath);
      if (fs.existsSync(abs)) {
        ids.push(t.id);
        break;
      }
    }
  }
  if (ids.length === 0) return;
  await this.prisma.track.updateMany({
    where: { id: { in: ids } },
    data: { status: FileStatus.TRASHED, trashedAt: new Date() },
  });
  this.logger.log(`Soft-trashed ${ids.length} track(s) after file source removal.`);
}
```

注：上面的 `existsSync` 校验是为了只在"旧路径已被移除"的情况下才软删——如果路径还在（用户只是没改它），不动。兼容现有 `normalizeLegacyDisabledTracks()` 复用。

- [ ] **Step 2: 写失败的 controller 测试**

创建 `services/api/src/controllers/file-sources.controller.spec.ts`，对 controller 的 `checkAdmin` 调用和参数传递做最小验证（Mock `UserService`、`FileSourcesService`、`ImportService`）。

```ts
import { FileSourcesController } from './file-sources.controller';

const makeRes = () => ({ code: jest.fn().mockReturnThis(), json: jest.fn() });

describe('FileSourcesController', () => {
  it('list returns 403 for non-admin', async () => {
    const userService = { getUserById: jest.fn().mockResolvedValue({ is_admin: false }) };
    const fileSources = { getSources: jest.fn() };
    const importService = { setupWatcher: jest.fn(), createTask: jest.fn() };
    const c = new FileSourcesController(userService as any, fileSources as any, importService as any);
    await expect(c.list({ user: { userId: 1 } } as any)).rejects.toThrow('需要管理员权限');
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `cd services/api && npx jest src/controllers/file-sources.controller.spec.ts`
Expected: FAIL — controller 不存在

- [ ] **Step 4: 实现 `FileSourcesController`**

```ts
// services/api/src/controllers/file-sources.controller.ts
import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Req } from '@nestjs/common';
import { IErrorResponse, ISuccessResponse } from '../common/const';
import { LogMethod } from '../common/log-method.decorator';
import { FileSourcesService, FileSources, FileSourcesView } from '../services/file-sources.service';
import { ImportService } from '../services/import';
import { UserService } from '../services/user';
import * as path from 'path';

@Controller('admin/file-sources')
export class FileSourcesController {
  constructor(
    private readonly userService: UserService,
    private readonly fileSources: FileSourcesService,
    private readonly importService: ImportService,
  ) {}

  private async checkAdmin(userId: number) {
    const user = await this.userService.getUserById(userId);
    if (!user || !user.is_admin) throw new ForbiddenException('需要管理员权限');
  }

  @Get()
  @LogMethod()
  async list(@Req() req: any): Promise<ISuccessResponse<FileSourcesView> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    const view = await this.fileSources.getSources();
    return { code: 200, message: 'success', data: view };
  }

  @Post()
  @LogMethod()
  async save(
    @Req() req: any,
    @Body() body: FileSources,
  ): Promise<ISuccessResponse<FileSourcesView> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('请求格式错误');
    }
    try {
      const previous = await this.fileSources.snapshot();
      await this.fileSources.save(body);

      const resolved = await this.fileSources.getResolved();
      const cacheDir = path.resolve(process.env.CACHE_DIR || './music/cover');
      // Rebuild watcher with the new path set (same semantics as bootstrap).
      this.importService.setupWatcher(resolved.musicDirs, resolved.audiobookDirs, resolved.mvDirs, cacheDir);

      // Soft-trash tracks that lived under removed paths (best-effort, logged inside).
      await this.importService.applyFileSourcesChanges(
        { musicDirs: previous.musicDirs, audiobookDirs: previous.audiobookDirs, mvDirs: previous.mvDirs },
        { musicDirs: body.musicDirs, audiobookDirs: body.audiobookDirs, mvDirs: body.mvDirs },
      );

      const view = await this.fileSources.getSources();
      return { code: 200, message: 'success', data: view };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { code: 500, message };
    }
  }

  @Post('sync')
  @LogMethod()
  async sync(@Req() req: any): Promise<ISuccessResponse<{ taskId: string }> | IErrorResponse> {
    await this.checkAdmin(req.user.userId);
    const resolved = await this.fileSources.getResolved();
    const cacheDir = path.resolve(process.env.CACHE_DIR || './music/cover');
    const taskId = this.importService.createTask(
      resolved.musicDirs,
      resolved.audiobookDirs,
      resolved.mvDirs,
      cacheDir,
      'incremental',
    );
    return { code: 200, message: 'success', data: { taskId } };
  }
}
```

- [ ] **Step 5: 在 `app.module.ts` 注册**

修改 `services/api/src/app.module.ts`：
- `import { FileSourcesController } from './controllers/file-sources.controller';`
- `import { FileSourcesService } from './services/file-sources.service';`
- 在 `controllers: [...]` 数组加 `FileSourcesController,`
- 在 `providers: [...]` 数组加 `FileSourcesService,`（仿 `WebDavConfigService` 位置）

- [ ] **Step 6: 跑测试确认通过**

Run: `cd services/api && npx jest src/controllers/file-sources.controller.spec.ts src/services/file-sources.service.spec.ts`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add services/api/src/controllers/file-sources.controller.ts services/api/src/services/file-sources.service.spec.ts services/api/src/services/import.ts services/api/src/app.module.ts
git commit -m "feat(api): file sources controller + soft-trash removed paths"
```

---

## Task 3: api `DynamicStaticMiddleware` + `main.ts` 接入

**Files:**
- Create: `services/api/src/middleware/dynamic-static.middleware.ts`
- Modify: `services/api/src/main.ts`（删 `useStaticAssets` 多路径循环，改挂中间件）

**Interfaces:**
- Consumes: `FileSourcesService.getResolved()`
- Produces: Nest 中间件 `(req, res, next) => Promise<void>`，处理 `/music/*` 与 `/audio/*` 前缀

- [ ] **Step 1: 实现中间件**

```ts
// services/api/src/middleware/dynamic-static.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { FileSourcesService } from '../services/file-sources.service';

@Injectable()
export class DynamicStaticMiddleware implements NestMiddleware {
  constructor(private readonly fileSources: FileSourcesService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const url = req.path;
    if (!url.startsWith('/music/') && !url.startsWith('/audio/')) return next();

    const { musicDirs, audiobookDirs, mvDirs } = await this.fileSources.getResolved();

    // MV currently maps to /music/ (see import.ts convertToHttpUrl). Combine music+mv into one
    // search space for /music/* requests.
    const candidates =
      url.startsWith('/music/')
        ? [...musicDirs, ...mvDirs]
        : audiobookDirs;

    const rel = decodeURIComponent(url.replace(/^\/(music|audio)\//, ''));
    for (const base of candidates) {
      const abs = path.resolve(base, rel);
      // Path traversal guard
      if (!abs.startsWith(path.resolve(base) + path.sep) && abs !== path.resolve(base)) continue;
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        const ext = path.extname(abs).toLowerCase();
        res.setHeader('Accept-Ranges', 'bytes');
        if (url.startsWith('/music/') && ext === '.mp4') res.setHeader('Content-Type', 'video/mp4');
        else if (url.startsWith('/music/') && ext === '.webm') res.setHeader('Content-Type', 'video/webm');
        else if (url.startsWith('/music/') && ext === '.mkv') res.setHeader('Content-Type', 'video/x-matroska');
        else if (url.startsWith('/music/') && ext === '.mp3') res.setHeader('Content-Type', 'audio/mpeg');
        res.sendFile(abs);
        return;
      }
    }
    next();
  }
}
```

- [ ] **Step 2: 在 app.module 注册**

`app.module.ts` 增加：
```ts
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { DynamicStaticMiddleware } from './middleware/dynamic-static.middleware';
// ...
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DynamicStaticMiddleware).forRoutes('*');
  }
}
```

- [ ] **Step 3: 修改 `main.ts` 接入**

`main.ts` 中：
- 删掉第 47-82 行 music/audiobook/mv 的 `for (dir) app.useStaticAssets(...)` 三块（保留 `cacheDir` 那一块）
- 用 `await app.get(FileSourcesService).getResolved()` 拿当前路径
- bootstrap 里的 `myService.createTask(...)` 和 `myService.setupWatcher(...)` 入参全部改为来自 FileSourcesService（不是 env）
- 删掉 `resolvePathList(env)`、`DEFAULT_*_DIR` 的引入（不再用）

伪代码：
```ts
const fileSources = app.get(FileSourcesService);
await fileSources.onModuleInit(); // 显式确保种子完成（在 Nest 启动后通常已完成）
const resolved = await fileSources.getResolved();
const { musicDirs, audiobookDirs, mvDirs } = resolved;
// ... 用 musicDirs / audiobookDirs / mvDirs 替代 env 解析结果
```

- [ ] **Step 4: 本地启动验证**

Run: `cd services/api && pnpm run start:dev`
Expected: 启动不报错，`/music/`、`/audio/` 静态访问正常（如果有现存曲目）

- [ ] **Step 5: 提交**

```bash
git add services/api/src/middleware/dynamic-static.middleware.ts services/api/src/main.ts services/api/src/app.module.ts
git commit -m "feat(api): dynamic static middleware for /music /audio"
```

---

## Task 4: api 改造现有读取点 + TTS 读取 SystemSetting

**Files:**
- Modify: `services/api/src/services/track.ts:59-85`（`getFilePath` 改读 FileSourcesService）
- Modify: `services/api/src/controllers/import.ts:19-30`（fallback 改读 FileSourcesService）
- Modify: `services/tts/src/web_api/tasks.py:26-40`（`resolve_txt_dirs` 先查 SystemSetting）

**Interfaces:**
- Consumes: `FileSourcesService.getResolved()`
- Produces: 三个调用点统一从 FileSourcesService 读路径

- [ ] **Step 1: 修改 `track.ts` `getFilePath`**

把 `getFilePath` 改为构造函数注入 `FileSourcesService`，移除 `this.configService.get('MUSIC_BASE_DIR')`、`resolvePathList` 这块：

```ts
constructor(
  private readonly configService: ConfigService,
  private readonly fileSources: FileSourcesService,
) { /* ... */ }

public async getFilePath(trackPath: string): Promise<string | null> {
  if (trackPath.startsWith('/music/')) {
    const { musicDirs, mvDirs } = await this.fileSources.getResolved();
    const dirs = [...musicDirs, ...mvDirs]; // MV also uses /music/ prefix
    const relativePath = trackPath.replace('/music/', '');
    for (const dir of dirs) {
      const candidate = this.resolveCandidatePath(dir, relativePath);
      if (candidate) return candidate;
    }
    return path.join(dirs[0] || './music/music', relativePath);
  }
  if (trackPath.startsWith('/audio/')) {
    const { audiobookDirs } = await this.fileSources.getResolved();
    const relativePath = trackPath.replace('/audio/', '');
    for (const dir of audiobookDirs) {
      const candidate = this.resolveCandidatePath(dir, relativePath);
      if (candidate) return candidate;
    }
    return path.join(audiobookDirs[0] || './music/audio', relativePath);
  }
  if (trackPath.startsWith('/covers/')) {
    const cacheDir = path.resolve(this.configService.get<string>('CACHE_DIR') || DEFAULT_CACHE_DIR);
    const relativePath = trackPath.replace('/covers/', '');
    const candidate = this.resolveCandidatePath(cacheDir, relativePath);
    return candidate || path.join(cacheDir, relativePath);
  }
  return null;
}
```

⚠️ **破坏性变更**：原方法是同步 `string|null`，调用点要更新为 `await`。全仓搜 `getFilePath(`：现有调用点都在 track.ts 内部（`getTrackPlaybackProfile`、`resolvePlaybackFile`、`deleteFileSafely`），都是 `await`-able。逐一加 `await`。

- [ ] **Step 2: 修改 `controllers/import.ts` 的 fallback**

把 `musicPath/audiobookPath/mvPath` 的 fallback 改为：

```ts
const fileSources = this.fileSources ?? (this as any).fileSources; // 注入或懒加载
// 简单做法：在 ImportController 构造函数加 FileSourcesService 注入
const musicPaths = resolvePathListFromBody(
  musicPath,
  process.env.MUSIC_BASE_DIR || DEFAULT_MUSIC_DIR,
);
// 但保存过 file_sources 时优先用 DB：
const db = await this.fileSources.getResolved();
const fallback = db.musicDirs.join(';');
```

⚠️ 注：此 controller 不在本计划改造的强依赖路径上（前端不再直连 `/import/task` 改路径，但保留兼容）。本次只需把 fallback 链改为"DB 优先、env 次之、default 兜底"。同样改 `audiobookPaths` 与 `mvPaths`。

- [ ] **Step 3: 修改 `services/tts/src/web_api/tasks.py`**

```python
from sqlmodel import Session, select
from sqlalchemy import text
from src.database.models import engine

def _load_txt_dirs_from_setting():
    """Read txtDirs from the shared SystemSetting table (file_sources key).
    Returns a list of raw input strings, or None if not configured."""
    with Session(engine) as session:
        try:
            row = session.exec(
                text("SELECT value FROM system_setting WHERE key = :k"),
                params={"k": "file_sources"},
            ).first()
        except Exception:
            return None
    if not row or not row[0]:
        return None
    try:
        parsed = json.loads(row[0])
        dirs = parsed.get("txtDirs") if isinstance(parsed, dict) else None
        if isinstance(dirs, list) and dirs:
            return [str(x) for x in dirs if str(x).strip()]
    except Exception:
        return None
    return None

def resolve_txt_dirs():
    raw = _load_txt_dirs_from_setting()
    tts_dir = os.path.join(BASE_DIR, "services", "tts")
    if raw:
        resolved = []
        for item in raw:
            item = item.strip()
            if not item:
                continue
            if os.path.isabs(item):
                resolved.append(item)
            else:
                # Relative paths are resolved against api cwd (consistent with env semantics).
                # Fallback: if path doesn't exist under cwd, try tts_dir.
                cwd_candidate = os.path.abspath(os.path.join(os.getcwd(), item))
                if os.path.exists(cwd_candidate):
                    resolved.append(cwd_candidate)
                else:
                    resolved.append(os.path.abspath(os.path.join(tts_dir, item)))
        if resolved:
            return list(dict.fromkeys(resolved))
    # existing env fallback
    env_txt_dir = os.getenv("TXT_BASE_DIR")
    if env_txt_dir:
        ...
    return [os.path.join(BASE_DIR, "services/tts/data/novels")]
```

注意：`TTS` 服务和 api 共享 SQLite（`DATABASE_URL` 指向同一文件，see `services/tts/src/database/models.py:11`）。SystemSetting 表由 Prisma 创建，SQLModel 通过 `text()` SQL 直查。

- [ ] **Step 4: 跑 TTS 服务验证 list-files**

Run: `cd services/tts && python -c "from src.web_api.tasks import resolve_txt_dirs; print(resolve_txt_dirs())"`
Expected: 输出已配置 txtDirs 路径列表（或 fallback 默认值）

- [ ] **Step 5: 提交**

```bash
git add services/api/src/services/track.ts services/api/src/controllers/import.ts services/tts/src/web_api/tasks.py
git commit -m "feat: switch local-path readers to FileSourcesService + TTS setting"
```

---

## Task 5: 共享包 `packages/services` + mini 本地副本

**Files:**
- Create: `packages/services/src/file-sources.ts`
- Modify: `packages/services/src/index.ts`
- Create: `apps/mini/src/services/file-sources.ts`

**Interfaces:**
- `getFileSources()` → `Promise<FileSourcesView>`
- `saveFileSources(sources: FileSources)` → `Promise<FileSourcesView>`
- `syncFileSources()` → `Promise<{ taskId: string }>`

- [ ] **Step 1: 实现 `packages/services/src/file-sources.ts`**

```ts
import request from './request';
import type { ISuccessResponse } from './models';

export interface FileSources {
  musicDirs: string[];
  audiobookDirs: string[];
  mvDirs: string[];
  txtDirs: string[];
}

export type FileSourcesExists = Record<keyof FileSources, boolean[]>;
export interface FileSourcesView {
  sources: FileSources;
  exists: FileSourcesExists;
}

export const getFileSources = async () => {
  return request.get<ISuccessResponse<FileSourcesView>>('/admin/file-sources');
};

export const saveFileSources = async (sources: FileSources) => {
  return request.post<ISuccessResponse<FileSourcesView>>('/admin/file-sources', sources);
};

export const syncFileSources = async () => {
  return request.post<ISuccessResponse<{ taskId: string }>>('/admin/file-sources/sync');
};
```

- [ ] **Step 2: 在 `index.ts` 导出**

```ts
export * from './file-sources';
```

- [ ] **Step 3: 实现 mini 本地副本 `apps/mini/src/services/file-sources.ts`**

```ts
import { ISuccessResponse } from '../models';
import request from '../utils/request';

export interface FileSources {
  musicDirs: string[];
  audiobookDirs: string[];
  mvDirs: string[];
  txtDirs: string[];
}
export type FileSourcesExists = Record<keyof FileSources, boolean[]>;
export interface FileSourcesView {
  sources: FileSources;
  exists: FileSourcesExists;
}

export const getFileSources = () =>
  request.get<any, ISuccessResponse<FileSourcesView>>('/admin/file-sources');

export const saveFileSources = (sources: FileSources) =>
  request.post<any, ISuccessResponse<FileSourcesView>>('/admin/file-sources', sources);

export const syncFileSources = () =>
  request.post<any, ISuccessResponse<{ taskId: string }>>('/admin/file-sources/sync');
```

- [ ] **Step 4: 提交**

```bash
git add packages/services/src/file-sources.ts packages/services/src/index.ts apps/mini/src/services/file-sources.ts
git commit -m "feat(services): file sources API + mini local copy"
```

---

## Task 6: desktop UI

**Files:**
- Create: `apps/desktop/src/pages/Settings/FileSourcesSettings.tsx`
- Modify: `apps/desktop/src/pages/Settings/index.tsx:560-570`（sources tab 内插入新组件）
- Modify: i18n 文件（`apps/desktop/src/i18n/locales/*.json`）增加 key

**Interfaces:**
- 4 个分组（音乐/有声书/MV/TXT），每组多行路径输入（antd `Space.Compact` 或 `Form.List`）
- 「保存」：调 `saveFileSources`，成功后 message
- 「同步」：调 `syncFileSources` 拿到 taskId → `getImportTask` 轮询（复用 `WebDavSourcesSettings` 的 `pollTask` 模式）

- [ ] **Step 1: 创建组件骨架（先可渲染空态）**

仿 `WebDavSourcesSettings` 结构：

```tsx
import {
  Button,
  Empty,
  Form,
  Input,
  Progress,
  Space,
  Tag,
  Typography,
  message as antdMessage,
} from "antd";
import {
  getFileSources,
  saveFileSources,
  syncFileSources,
  getImportTask,
  type FileSources,
  type FileSourcesView,
} from "@soundx/services";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMessage } from "../../context/MessageContext";

const { Text, Paragraph } = Typography;

const FIELDS = [
  { key: "musicDirs", labelKey: "settings.fileSourcesMusic", placeholderKey: "settings.filePathPlaceholder", existsKey: "settings.filePathExists" },
  { key: "audiobookDirs", labelKey: "settings.fileSourcesAudiobook", placeholderKey: "settings.filePathPlaceholder", existsKey: "settings.filePathExists" },
  { key: "mvDirs", labelKey: "settings.fileSourcesMv", placeholderKey: "settings.filePathPlaceholder", existsKey: "settings.filePathExists" },
  { key: "txtDirs", labelKey: "settings.fileSourcesTxt", placeholderKey: "settings.filePathPlaceholder", existsKey: "settings.filePathExists" },
] as const;

const normalize = (arr?: string[]) => (arr && arr.length > 0 ? arr : [""]);

const FileSourcesSettings: React.FC = () => {
  const { t } = useTranslation();
  const message = useMessage();
  const [sources, setSources] = useState<FileSources>({ musicDirs: [""], audiobookDirs: [""], mvDirs: [""], txtDirs: [""] });
  const [exists, setExists] = useState<Record<keyof FileSources, boolean[]>>({
    musicDirs: [false], audiobookDirs: [false], mvDirs: [false], txtDirs: [false],
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<{ current?: number; total?: number; message?: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const load = async () => {
    try {
      const res = await getFileSources();
      if (res.code === 200) {
        const view = res.data as FileSourcesView;
        setSources({
          musicDirs: normalize(view.sources.musicDirs),
          audiobookDirs: normalize(view.sources.audiobookDirs),
          mvDirs: normalize(view.sources.mvDirs),
          txtDirs: normalize(view.sources.txtDirs),
        });
        setExists(view.exists);
      } else {
        antdMessage.error(res.message || t("common.error"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const setFieldLine = (key: keyof FileSources, idx: number, value: string) => {
    setSources((prev) => {
      const next = [...prev[key]];
      next[idx] = value;
      return { ...prev, [key]: next };
    });
  };
  const addFieldLine = (key: keyof FileSources) =>
    setSources((prev) => ({ ...prev, [key]: [...prev[key], ""] }));
  const removeFieldLine = (key: keyof FileSources, idx: number) =>
    setSources((prev) => {
      const next = prev[key].filter((_, i) => i !== idx);
      return { ...prev, [key]: next.length > 0 ? next : [""] };
    });

  const compact = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: FileSources = {
        musicDirs: compact(sources.musicDirs),
        audiobookDirs: compact(sources.audiobookDirs),
        mvDirs: compact(sources.mvDirs),
        txtDirs: compact(sources.txtDirs),
      };
      const res = await saveFileSources(payload);
      if (res.code === 200) {
        const view = res.data as FileSourcesView;
        setSources({
          musicDirs: normalize(view.sources.musicDirs),
          audiobookDirs: normalize(view.sources.audiobookDirs),
          mvDirs: normalize(view.sources.mvDirs),
          txtDirs: normalize(view.sources.txtDirs),
        });
        setExists(view.exists);
        message.success(t("settings.fileSourcesSaveSuccess"));
      } else {
        message.error(res.message || t("settings.fileSourcesSaveFailed"));
      }
    } catch (e) {
      console.error(e);
      message.error(t("settings.fileSourcesSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };
  const pollTask = (id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await getImportTask(id);
        if (res.code === 200) {
          const task = res.data;
          if (!task || task.id !== id) return;
          setProgress({ current: task.current, total: task.total, message: task.message });
          if (task.status === "SUCCESS" || task.status === "FAILED") {
            stopPolling();
            setSyncing(false);
            if (task.status === "SUCCESS") message.success(task.message || t("settings.fileSourcesSyncComplete"));
            else message.error(task.message || t("settings.fileSourcesSyncFailed"));
          }
        }
      } catch { /* keep polling */ }
    }, 1500);
  };
  const handleSync = async () => {
    setSyncing(true);
    setProgress({ current: 0, total: 0 });
    try {
      const res = await syncFileSources();
      if (res.code === 200 && res.data?.taskId) {
        setProgress({ current: 0, total: 0, message: t("settings.fileSourcesSyncStarting") });
        pollTask(res.data.taskId);
      } else {
        message.error(res.message || t("settings.fileSourcesSyncFailed"));
        setSyncing(false);
      }
    } catch (e) {
      console.error(e);
      message.error(t("settings.fileSourcesSyncFailed"));
      setSyncing(false);
    }
  };

  const pct = useMemo(() => {
    if (!progress || !progress.total || progress.total <= 0) return 0;
    return Math.min(100, Math.round(((progress.current || 0) / progress.total) * 100));
  }, [progress]);

  return (
    <section>
      <Paragraph type="secondary">{t("settings.fileSourcesDescription")}</Paragraph>
      {FIELDS.map(({ key, labelKey, placeholderKey, existsKey }) => (
        <div key={key} style={{ marginBottom: 24 }}>
          <Text strong>{t(labelKey)}</Text>
          <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
            {(sources[key] ?? [""]).map((value, idx) => (
              <Space.Compact key={idx} style={{ width: "100%" }}>
                <Input
                  value={value}
                  onChange={(e) => setFieldLine(key, idx, e.target.value)}
                  placeholder={t(placeholderKey)}
                  style={{ width: "calc(100% - 90px)" }}
                />
                <Button onClick={() => removeFieldLine(key, idx)} danger disabled={(sources[key] ?? []).length <= 1}>
                  {t("common.delete")}
                </Button>
              </Space.Compact>
            ))}
            <Button onClick={() => addFieldLine(key)} type="dashed">
              {t("settings.fileSourcesAddPath")}
            </Button>
            <div>
              {(exists[key] ?? []).map((e, i) => (
                <Tag key={i} color={e ? "green" : "orange"}>
                  {sources[key][i] || "(empty)"} {e ? t(existsKey) : t("settings.filePathMissing")}
                </Tag>
              ))}
            </div>
          </Space>
        </div>
      ))}
      <Space>
        <Button type="primary" loading={saving} onClick={handleSave}>{t("common.save")}</Button>
        <Button loading={syncing} onClick={handleSync}>{t("settings.fileSourcesSync")}</Button>
      </Space>
      {progress && (
        <div style={{ marginTop: 12 }}>
          <Progress percent={pct} status={syncing ? "active" : "normal"} />
          {progress.message && <Text type="secondary">{progress.message}</Text>}
        </div>
      )}
    </section>
  );
};

export default FileSourcesSettings;
```

- [ ] **Step 2: 在 `Settings/index.tsx` 引入并放置**

在 `sources` tab 的 `WebDavSourcesSettings` 上方加一个 section：

```tsx
import FileSourcesSettings from "./FileSourcesSettings";
// ...
// 在 WebDavSourcesSettings 前面：
<section className={styles.section}>
  <Title level={4} className={styles.sectionTitle}>
    {t("settings.fileSources")}
  </Title>
  <FileSourcesSettings />
</section>
<Divider className={styles.divider} />
```

- [ ] **Step 3: 加 i18n key**

在 `apps/desktop/src/i18n/locales/zh-CN.json` 和 `en-US.json`：

```json
"fileSources": "文件数据源",
"fileSourcesDescription": "配置服务端媒体目录路径，相对路径以 api 子项目目录为基准解析。保存后仅重建文件监听，需点「同步」触发扫描。",
"fileSourcesMusic": "音乐目录",
"fileSourcesAudiobook": "有声书目录",
"fileSourcesMv": "MV 目录",
"fileSourcesTxt": "TXT 小说目录",
"fileSourcesAddPath": "添加路径",
"fileSourcesSync": "同步",
"fileSourcesSyncStarting": "正在启动...",
"fileSourcesSyncComplete": "同步完成",
"fileSourcesSyncFailed": "同步失败",
"fileSourcesSaveSuccess": "保存成功，文件监听已重建",
"fileSourcesSaveFailed": "保存失败",
"filePathPlaceholder": "绝对路径或相对 api 目录的路径",
"filePathExists": "目录存在",
"filePathMissing": "目录不存在"
```

- [ ] **Step 4: 启动验证**

Run: `cd apps/desktop && pnpm run tauri dev`
Expected: 设置页 sources tab 出现「文件数据源」版块在 WebDAV 之前；修改路径、保存、点同步能看到进度条

- [ ] **Step 5: 提交**

```bash
git add apps/desktop/src/pages/Settings/FileSourcesSettings.tsx apps/desktop/src/pages/Settings/index.tsx apps/desktop/src/i18n/locales/
git commit -m "feat(desktop): file sources settings UI"
```

---

## Task 7: mobile UI (Expo/RN)

**Files:**
- Create: `apps/mobile/app/file-sources.tsx`
- Modify: `apps/mobile/app/settings.tsx:476`（在 webdav-sources TouchableOpacity 之前插入新入口）
- Modify: i18n key

**Interfaces:** 与 desktop 等价：4 组路径多行输入（每组 TextInput + 加/减按钮）；保存调 `saveFileSources`；同步调 `syncFileSources` 后轮询 `getImportTask`

- [ ] **Step 1: 创建页面**

仿 `apps/mobile/app/webdav-sources.tsx` 结构，4 个 section，路径用 TextInput，add/remove 按钮，Switch 风格不需要（没启用/停用开关）。同步复用 `pollTask` 逻辑。

```tsx
import {
  getFileSources,
  saveFileSources,
  syncFileSources,
  getImportTask,
  type FileSources,
  type FileSourcesView,
} from "@soundx/services";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../src/context/ThemeContext";
import { goBackOrReplace } from "../src/utils/navigation";

const FIELDS = [
  { key: "musicDirs", labelKey: "settings.fileSourcesMusic" },
  { key: "audiobookDirs", labelKey: "settings.fileSourcesAudiobook" },
  { key: "mvDirs", labelKey: "settings.fileSourcesMv" },
  { key: "txtDirs", labelKey: "settings.fileSourcesTxt" },
] as const;

const normalize = (arr?: string[]) => (arr && arr.length > 0 ? arr : [""]);

export default function FileSourcesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [sources, setSources] = useState<FileSources>({
    musicDirs: [""], audiobookDirs: [""], mvDirs: [""], txtDirs: [""],
  });
  const [exists, setExists] = useState<Record<keyof FileSources, boolean[]>>({
    musicDirs: [false], audiobookDirs: [false], mvDirs: [false], txtDirs: [false],
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<{ current?: number; total?: number; message?: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const load = async () => {
    try {
      const res = await getFileSources();
      if (res.code === 200) {
        const view = res.data as FileSourcesView;
        setSources({
          musicDirs: normalize(view.sources.musicDirs),
          audiobookDirs: normalize(view.sources.audiobookDirs),
          mvDirs: normalize(view.sources.mvDirs),
          txtDirs: normalize(view.sources.txtDirs),
        });
        setExists(view.exists);
      } else {
        Alert.alert(t("common.error"), res.message || t("common.error"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const setLine = (key: keyof FileSources, idx: number, value: string) => {
    setSources((prev) => {
      const next = [...prev[key]]; next[idx] = value;
      return { ...prev, [key]: next };
    });
  };
  const addLine = (key: keyof FileSources) =>
    setSources((prev) => ({ ...prev, [key]: [...prev[key], ""] }));
  const removeLine = (key: keyof FileSources, idx: number) =>
    setSources((prev) => {
      const next = prev[key].filter((_, i) => i !== idx);
      return { ...prev, [key]: next.length > 0 ? next : [""] };
    });

  const compact = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveFileSources({
        musicDirs: compact(sources.musicDirs),
        audiobookDirs: compact(sources.audiobookDirs),
        mvDirs: compact(sources.mvDirs),
        txtDirs: compact(sources.txtDirs),
      });
      if (res.code === 200) {
        const view = res.data as FileSourcesView;
        setSources({
          musicDirs: normalize(view.sources.musicDirs),
          audiobookDirs: normalize(view.sources.audiobookDirs),
          mvDirs: normalize(view.sources.mvDirs),
          txtDirs: normalize(view.sources.txtDirs),
        });
        setExists(view.exists);
        Alert.alert(t("common.success"), t("settings.fileSourcesSaveSuccess"));
      } else {
        Alert.alert(t("settings.fileSourcesSaveFailed"), res.message || "");
      }
    } catch (e: any) {
      Alert.alert(t("settings.fileSourcesSaveFailed"), e?.message || "");
    } finally {
      setSaving(false);
    }
  };

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  const pollTask = (id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await getImportTask(id);
        if (res.code === 200) {
          const task = res.data;
          if (!task || task.id !== id) return;
          setProgress({ current: task.current, total: task.total, message: task.message });
          if (task.status === "SUCCESS" || task.status === "FAILED") {
            stopPolling();
            setSyncing(false);
            if (task.status === "SUCCESS") Alert.alert(t("common.success"), task.message || t("settings.fileSourcesSyncComplete"));
            else Alert.alert(t("settings.fileSourcesSyncFailed"), task.message || "");
          }
        }
      } catch { /* keep polling */ }
    }, 1500);
  };
  const handleSync = async () => {
    setSyncing(true);
    setProgress({ current: 0, total: 0 });
    try {
      const res = await syncFileSources();
      if (res.code === 200 && res.data?.taskId) {
        pollTask(res.data.taskId);
      } else {
        Alert.alert(t("settings.fileSourcesSyncFailed"), res.message || "");
        setSyncing(false);
      }
    } catch (e: any) {
      Alert.alert(t("settings.fileSourcesSyncFailed"), e?.message || "");
      setSyncing(false);
    }
  };

  const pct = progress && progress.total && progress.total > 0
    ? Math.min(100, Math.round(((progress.current || 0) / progress.total) * 100))
    : 0;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => goBackOrReplace(router, "/settings")} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("settings.fileSources")}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.description, { color: colors.secondary }]}>{t("settings.fileSourcesDescription")}</Text>

        {FIELDS.map(({ key, labelKey }) => (
          <View key={key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t(labelKey)}</Text>
            {(sources[key] ?? [""]).map((value, idx) => (
              <View key={idx} style={styles.pathRow}>
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  value={value}
                  onChangeText={(v) => setLine(key, idx, v)}
                  placeholder={t("settings.filePathPlaceholder")}
                  placeholderTextColor={colors.secondary}
                />
                <TouchableOpacity onPress={() => removeLine(key, idx)} disabled={(sources[key] ?? []).length <= 1}>
                  <Ionicons name="trash-outline" size={22} color={(sources[key] ?? []).length <= 1 ? colors.secondary : "#cf1322"} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={() => addLine(key)} style={[styles.addBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.primary }}>+ {t("settings.fileSourcesAddPath")}</Text>
            </TouchableOpacity>
            <View style={styles.tagRow}>
              {(exists[key] ?? []).map((e, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: e ? "#52c41a22" : "#faad1422" }]}>
                  <Text style={{ color: e ? "#389e0d" : "#d46b08", fontSize: 12 }}>
                    {sources[key][i] || "(empty)"} · {e ? t("settings.filePathExists") : t("settings.filePathMissing")}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} disabled={saving} onPress={handleSave}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t("common.save")}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} disabled={syncing} onPress={handleSync}>
            {syncing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t("settings.fileSourcesSync")}</Text>}
          </TouchableOpacity>
        </View>
        {progress && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: colors.secondary }}>{progress.message || ""} ({pct}%)</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "600", textAlign: "center" },
  scrollContent: { padding: 16, paddingBottom: 80 },
  description: { marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  pathRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  addBtn: { borderWidth: 1, borderStyle: "dashed", borderRadius: 6, padding: 10, alignItems: "center", marginTop: 4 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 6, marginBottom: 4 },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
});
```

- [ ] **Step 2: 在 settings.tsx 加入口**

`apps/mobile/app/settings.tsx:476` 之前的 webdav-sources TouchableOpacity 之前复制一份，把 link 改为 `/file-sources`，label 用 `settings.fileSources`，icon 改 `folder-outline`：

```tsx
{user?.is_admin && (
  <TouchableOpacity
    style={[styles.settingRow, { borderBottomColor: colors.border }]}
    onPress={() => router.push("/file-sources" as any)}
  >
    <View style={styles.settingInfo}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{t("settings.fileSources")}</Text>
      <Text style={[styles.settingDescription, { color: colors.secondary }]}>{t("settings.fileSourcesDescription")}</Text>
    </View>
    <Ionicons name="folder-outline" size={20} color={colors.secondary} />
  </TouchableOpacity>
)}
```

- [ ] **Step 3: 加 i18n key**

`apps/mobile/src/i18n/locales/*.json`（沿用现有 key 与 desktop 同步）

- [ ] **Step 4: Expo 启动验证**

Run: `cd apps/mobile && pnpm run start`
Expected: 模拟器中设置页能看到「文件数据源」入口；进入页面可编辑 4 组路径；保存后端确认收到请求；同步可看到进度

- [ ] **Step 5: 提交**

```bash
git add apps/mobile/app/file-sources.tsx apps/mobile/app/settings.tsx apps/mobile/src/i18n/locales/
git commit -m "feat(mobile): file sources settings screen"
```

---

## Task 8: mini UI (Taro)

**Files:**
- Create: `apps/mini/src/pages/file-sources/index.tsx`, `apps/mini/src/pages/file-sources/index.config.ts`
- Modify: `apps/mini/src/pages/settings/index.tsx:244`（webdav-sources 入口前插入）
- Modify: `apps/mini/src/app.config.ts` 注册路由
- Modify: i18n key

**Interfaces:** 仿 webdav-sources 模式：卡片列表 + 底部弹层编辑器（Textarea 多行输入路径，按 `\n;,` 分割）；底部固定「保存」+「同步」按钮

- [ ] **Step 1: 创建页面骨架**

```tsx
// apps/mini/src/pages/file-sources/index.tsx
import { Text, Textarea, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  getFileSources,
  saveFileSources,
  syncFileSources,
  type FileSources,
  type FileSourcesView,
} from '../../services/file-sources';
import './index.scss';

const FIELDS = [
  { key: 'musicDirs', labelKey: 'settings.fileSourcesMusic' },
  { key: 'audiobookDirs', labelKey: 'settings.fileSourcesAudiobook' },
  { key: 'mvDirs', labelKey: 'settings.fileSourcesMv' },
  { key: 'txtDirs', labelKey: 'settings.fileSourcesTxt' },
] as const;
type FieldKey = (typeof FIELDS)[number]['key'];

const split = (raw: string) => raw.split(/[\n;,]/).map((s) => s.trim()).filter(Boolean);

export default function FileSources() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [draft, setDraft] = useState<Record<FieldKey, string>>({
    musicDirs: '', audiobookDirs: '', mvDirs: '', txtDirs: '',
  });
  const [exists, setExists] = useState<Record<FieldKey, boolean[]>>({
    musicDirs: [], audiobookDirs: [], mvDirs: [], txtDirs: [],
  });
  const [saving, setSaving] = useState(false);

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: t('settings.fileSources') });
    Taro.setNavigationBarColor({
      frontColor: colors.text === '#11181C' ? '#000000' : '#ffffff',
      backgroundColor: colors.background,
    });
    fetchData();
  });

  const fetchData = async () => {
    try {
      const res = await getFileSources();
      if (res.code === 200) {
        const view = res.data as FileSourcesView;
        setDraft({
          musicDirs: (view.sources.musicDirs || []).join('\n'),
          audiobookDirs: (view.sources.audiobookDirs || []).join('\n'),
          mvDirs: (view.sources.mvDirs || []).join('\n'),
          txtDirs: (view.sources.txtDirs || []).join('\n'),
        });
        setExists(view.exists);
      }
    } catch (e) {
      console.warn('Failed to load file sources', e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: FileSources = {
        musicDirs: split(draft.musicDirs),
        audiobookDirs: split(draft.audiobookDirs),
        mvDirs: split(draft.mvDirs),
        txtDirs: split(draft.txtDirs),
      };
      const res = await saveFileSources(payload);
      if (res.code === 200) {
        const view = res.data as FileSourcesView;
        setExists(view.exists);
        Taro.showToast({ title: t('settings.fileSourcesSaveSuccess'), icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || t('settings.fileSourcesSaveFailed'), icon: 'none' });
      }
    } catch (e: any) {
      Taro.showToast({ title: e?.message || t('settings.fileSourcesSaveFailed'), icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    Taro.showLoading({ title: t('settings.fileSourcesSync') });
    try {
      const res = await syncFileSources();
      Taro.hideLoading();
      if (res.code === 200) {
        Taro.showToast({ title: t('settings.fileSourcesSyncStarted'), icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || t('settings.fileSourcesSyncFailed'), icon: 'none' });
      }
    } catch (e: any) {
      Taro.hideLoading();
      Taro.showToast({ title: e?.message || t('settings.fileSourcesSyncFailed'), icon: 'none' });
    }
  };

  return (
    <View className='file-sources' style={{ backgroundColor: colors.background }}>
      <View className='header'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon icon icon-back' style={{ color: colors.text }} />
        </View>
        <Text className='header-title' style={{ color: colors.text }}>{t('settings.fileSources')}</Text>
        <View style={{ width: '80rpx' }} />
      </View>
      <Text className='description' style={{ color: colors.secondary }}>
        {t('settings.fileSourcesDescription')}
      </Text>
      <View className='form-list'>
        {FIELDS.map(({ key, labelKey }) => (
          <View key={key} className='form-field'>
            <Text className='field-label' style={{ color: colors.text }}>{t(labelKey)}</Text>
            <Textarea
              className='field-input'
              style={{ color: colors.text, backgroundColor: colors.card, borderColor: colors.border, minHeight: '180rpx' }}
              value={draft[key]}
              onInput={(e) => setDraft((prev) => ({ ...prev, [key]: e.detail.value }))}
              placeholder={t('settings.filePathPlaceholder')}
              placeholderStyle={{ color: colors.secondary }}
              autoHeight
            />
            <View className='tag-row'>
              {(exists[key] || []).map((e, i) => (
                <Text
                  key={i}
                  className='tag'
                  style={{ color: e ? '#389e0d' : '#d46b08', backgroundColor: e ? '#52c41a22' : '#faad1422' }}
                >
                  {e ? t('settings.filePathExists') : t('settings.filePathMissing')}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
      <View className='bottom-actions'>
        <View className='btn btn-secondary' style={{ backgroundColor: colors.card, color: colors.text, borderColor: colors.border }} onClick={saving ? undefined : handleSave}>
          <Text style={{ color: colors.text }}>{t('common.save')}</Text>
        </View>
        <View className='btn btn-primary' style={{ backgroundColor: colors.primary }} onClick={handleSync}>
          <Text style={{ color: '#fff' }}>{t('settings.fileSourcesSync')}</Text>
        </View>
      </View>
    </View>
  );
}
```

```ts
// apps/mini/src/pages/file-sources/index.config.ts
export default {
  navigationBarTitleText: '文件数据源',
};
```

- [ ] **Step 2: 在 settings/index.tsx 加入口**

```tsx
{user?.is_admin && renderActionRow(
  t('settings.fileSources'),
  t('settings.fileSourcesDescription'),
  () => Taro.navigateTo({ url: '/pages/file-sources/index' })
)}
```
放在 webdav-sources 入口之前

- [ ] **Step 3: 在 `app.config.ts` 注册路由**

`apps/mini/src/app.config.ts` 的 `pages` 数组加 `"pages/file-sources/index"`

- [ ] **Step 4: 加 SCSS 与 i18n**

`apps/mini/src/pages/file-sources/index.scss` 仿 webdav-sources 的样式。
i18n key 与 desktop/mobile 同步。

- [ ] **Step 5: taro 启动验证**

Run: `cd apps/mini && pnpm run dev:weapp`（或对应平台）
Expected: 设置页看到「文件数据源」入口；进入可编辑 4 组路径；保存可提示成功；同步有 loading

- [ ] **Step 6: 提交**

```bash
git add apps/mini/src/pages/file-sources apps/mini/src/pages/settings/index.tsx apps/mini/src/app.config.ts apps/mini/src/i18n/locales/
git commit -m "feat(mini): file sources settings page"
```

---

## Task 9: 端到端验证与 README 更新

- [ ] **Step 1: 全栈端到端走一遍**
1. `cd services/api && pnpm run start:dev` + `cd services/tts && uvicorn src.main:app`（如有）
2. `cd apps/desktop && pnpm run tauri dev`
3. docker-compose 把 `MUSIC_BASE_DIR` 设两个目录（用 `;` 分隔）→ 启动后看 desktop 设置页是否显示两个种子
4. 在 UI 添加一个新目录保存 → 应立即被 watcher 监听（新增文件自动入库）
5. 删除一个目录保存 → 该目录下的曲目应被软删（不在前台列表展示）
6. 点同步 → 进度条完成
7. 在 desktop 测同样流程；mobile 跑 expo；mini 跑 taro

- [ ] **Step 2: 更新 docker-compose 文档**

`docker-compose.yml` / `docker-compose-nas.yaml` 注释：env 可选；如使用 UI 配置可忽略。注意：env 与 UI 二选一时，应使用 UI（DB）为准；保留 env 仅作种子用途

- [ ] **Step 3: 提交**

```bash
git add docker-compose.yml docker-compose-nas.yaml
git commit -m "docs: document file_sources UI as preferred over env"
```