import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@soundx/db';
import { createClient, WebDAVClient } from 'webdav';

export type WebDavPathKind = 'MUSIC' | 'AUDIOBOOK' | 'MV';

export interface WebDavSource {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  enabled: boolean;
  // Each path is optional. An empty/missing path means that content type is not provided
  // by this server. Paths are interpreted as absolute paths on the WebDAV server root.
  paths: {
    MUSIC?: string;
    AUDIOBOOK?: string;
    MV?: string;
  };
}

export interface WebDavSourceInput {
  id?: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  enabled?: boolean;
  paths?: {
    MUSIC?: string;
    AUDIOBOOK?: string;
    MV?: string;
  };
}

const SETTING_KEY = 'webdav_sources';

const PATH_KIND_ORDER: WebDavPathKind[] = ['MUSIC', 'AUDIOBOOK', 'MV'];

@Injectable()
export class WebDavConfigService implements OnModuleInit {
  private readonly logger = new Logger(WebDavConfigService.name);
  private prisma: PrismaClient;
  private cache: WebDavSource[] | null = null;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async onModuleInit() {
    const dbSources = await this.readFromDb();
    if (dbSources.length > 0) {
      this.cache = dbSources;
      return;
    }

    const envSources = this.buildSourcesFromEnv();
    if (envSources.length > 0) {
      this.logger.log(
        `No WebDAV sources persisted in DB. Seeding ${envSources.length} source(s) from environment variables (legacy compatibility).`,
      );
      await this.writeToDb(envSources);
      this.cache = envSources;
    } else {
      this.cache = [];
    }
  }

  async list(): Promise<WebDavSource[]> {
    if (this.cache === null) {
      this.cache = await this.readFromDb();
    }
    return this.clone(this.cache);
  }

  async save(sources: WebDavSourceInput[]): Promise<WebDavSource[]> {
    const normalized = sources.map((source) => this.normalizeSource(source));
    await this.writeToDb(normalized);
    this.cache = normalized;
    return this.clone(this.cache);
  }

  /**
   * Test connectivity to a WebDAV source without persisting it.
   * If any sub-path is provided, we verify it can be listed; otherwise we list the root.
   */
  async testConnection(source: WebDavSourceInput): Promise<{
    success: boolean;
    message: string;
    details?: Record<string, { success: boolean; message: string }>;
  }> {
    if (!source.url || !source.url.trim()) {
      return { success: false, message: 'WebDAV URL 不能为空' };
    }
    try {
      const client = this.createClient(source.url, source.username, source.password);
      const paths = this.normalizePaths(source.paths);
      const targetPaths: { kind: WebDavPathKind; path: string }[] = [];
      for (const kind of PATH_KIND_ORDER) {
        const p = paths[kind];
        if (p) targetPaths.push({ kind, path: p });
      }
      // When no sub-path is set, fall back to the root for a base reachability check.
      if (targetPaths.length === 0) {
        targetPaths.push({ kind: 'MUSIC', path: '/' });
      }

      const details: Record<string, { success: boolean; message: string }> = {};
      let allOk = true;
      for (const { kind, path } of targetPaths) {
        try {
          await client.getDirectoryContents(path);
          details[kind] = { success: true, message: '连接成功' };
        } catch (error) {
          allOk = false;
          const message = error instanceof Error ? error.message : String(error);
          details[kind] = { success: false, message: this.translateError(error, message) };
        }
      }
      if (allOk) {
        return { success: true, message: '连接成功', details };
      }
      return { success: false, message: '部分路径连接失败', details };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`WebDAV test connection failed for ${source.url}: ${message}`);
      return { success: false, message: this.translateError(error, message) };
    }
  }

  /**
   * Flatten configured sources into concrete scan targets (one per non-empty path).
   * Used by the importer so it doesn't have to know about the multi-path shape.
   */
  async listScanTargets(): Promise<
    Array<{
      source: WebDavSource;
      kind: WebDavPathKind;
      path: string;
    }>
  > {
    const sources = await this.list();
    const targets: Array<{ source: WebDavSource; kind: WebDavPathKind; path: string }> = [];
    for (const source of sources) {
      if (!source.enabled) continue;
      for (const kind of PATH_KIND_ORDER) {
        const p = source.paths[kind];
        if (p && p.trim()) {
          targets.push({ source, kind, path: this.normalizeRemotePath(p) });
        }
      }
    }
    return targets;
  }

  private createClient(url: string, username?: string, password?: string): WebDAVClient {
    let decoded = decodeURI(url);
    if (decoded.endsWith('/')) {
      decoded = decoded.slice(0, -1);
    }
    return createClient(decoded, {
      username: username || undefined,
      password: password || undefined,
    });
  }

  private normalizeSource(input: WebDavSourceInput): WebDavSource {
    const name = (input.name || '').trim();
    const url = (input.url || '').trim();
    if (!name) throw new Error('WebDAV 源名称不能为空');
    if (!url) throw new Error('WebDAV URL 不能为空');
    return {
      id: input.id || this.generateId(),
      name,
      url,
      username: input.username?.trim() || undefined,
      password: input.password || undefined,
      enabled: input.enabled !== false,
      paths: this.normalizePaths(input.paths),
    };
  }

  private normalizePaths(
    paths: WebDavSourceInput['paths'] | undefined,
  ): WebDavSource['paths'] {
    const result: WebDavSource['paths'] = {};
    if (!paths) return result;
    for (const kind of PATH_KIND_ORDER) {
      const raw = (paths as Record<string, string | undefined>)[kind];
      if (raw && raw.trim()) {
        result[kind] = raw.trim();
      }
    }
    return result;
  }

  private normalizeRemotePath(path: string): string {
    const trimmed = path.trim();
    if (!trimmed) return '/';
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  private generateId(): string {
    return `wd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private clone(sources: WebDavSource[]): WebDavSource[] {
    return sources.map((s) => ({
      ...s,
      paths: { ...s.paths },
    }));
  }

  private async readFromDb(): Promise<WebDavSource[]> {
    const raw = await this.prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw.value);
      if (!Array.isArray(parsed)) return [];
      const sources = parsed.filter((item): item is WebDavSource => this.isWebDavSource(item));
      return sources.map((source) => this.migrateLegacySource(source));
    } catch (e) {
      this.logger.warn(`Failed to parse ${SETTING_KEY} setting value, ignoring.`);
      return [];
    }
  }

  /**
   * Old sources (saved before the multi-path refactor) had a single `type` and `url`.
   * Map them to the new shape so existing users keep working.
   */
  private migrateLegacySource(raw: any): WebDavSource {
    if (raw.paths && typeof raw.paths === 'object') {
      return {
        id: raw.id,
        name: raw.name,
        url: raw.url,
        username: raw.username,
        password: raw.password,
        enabled: raw.enabled !== false,
        paths: this.normalizePaths(raw.paths),
      };
    }
    const legacyType: WebDavPathKind | undefined =
      raw.type === 'MUSIC' || raw.type === 'AUDIOBOOK' || raw.type === 'MV' ? raw.type : undefined;
    const paths: WebDavSource['paths'] = {};
    if (legacyType) paths[legacyType] = '/';
    return {
      id: raw.id,
      name: raw.name,
      url: raw.url,
      username: raw.username,
      password: raw.password,
      enabled: raw.enabled !== false,
      paths,
    };
  }

  private async writeToDb(sources: WebDavSource[]): Promise<void> {
    const value = JSON.stringify(sources);
    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value },
      create: { key: SETTING_KEY, value },
    });
  }

  private isWebDavSource(value: unknown): value is WebDavSource {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return (
      typeof v.id === 'string' &&
      typeof v.name === 'string' &&
      typeof v.url === 'string' &&
      typeof v.enabled === 'boolean'
    );
  }

  private buildSourcesFromEnv(): WebDavSource[] {
    // Legacy env vars held one URL per content type. Group them into a single source so the
    // migration target is the multi-path shape rather than the older single-type shape.
    const user = process.env.WEBDAV_USER;
    const pass = process.env.WEBDAV_PASSWORD;
    const music = process.env.WEBDAV_MUSIC_URL;
    const audiobook = process.env.WEBDAV_AUDIOBOOK_URL;
    const mv = process.env.WEBDAV_MV_URL;

    const sources: WebDavSource[] = [];
    // Each env var gets its own source because they may point to different servers entirely.
    const add = (url: string | undefined, kind: WebDavPathKind, label: string) => {
      if (!url) return;
      sources.push({
        id: this.generateId(),
        name: `${label} (env)`,
        url,
        username: user,
        password: pass,
        enabled: true,
        paths: { [kind]: '/' },
      });
    };

    add(music, 'MUSIC', '音乐');
    add(audiobook, 'AUDIOBOOK', '有声书');
    add(mv, 'MV', 'MV');

    return sources;
  }

  private translateError(error: unknown, fallback: string): string {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403) return '认证失败，请检查用户名/密码';
    if (status === 404) return '找不到 WebDAV 路径，请检查 URL';
    if (status === 0 || status === undefined) return `无法连接到 WebDAV 服务器：${fallback}`;
    return `连接失败 (${status}): ${fallback}`;
  }
}