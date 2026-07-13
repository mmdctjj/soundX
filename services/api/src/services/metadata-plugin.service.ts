import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  FileStatus,
  MetadataSource,
  PrismaClient,
  TrackType,
} from '@soundx/db';
import { ScanResult } from '@soundx/utils';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface PluginConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  type: 'http' | 'executable' | 'builtin';
  endpoint?: string;
  command?: string;
  timeout?: number;
  retry?: number;
  filter?: {
    types?: ('music' | 'audiobook' | 'mv')[];
    pathPattern?: string;
  };
}

export interface PluginInput {
  path: string;
  originalPath?: string;
  fileName: string;
  relativePath?: string;
  fileHash?: string;
  size: number;
  mtime: Date;
  type: 'music' | 'audiobook' | 'mv';
  metadata: {
    title?: string;
    artist?: string;
    album?: string;
    albumArtist?: string;
    duration?: number;
    year?: number;
    trackNo?: number;
    lyrics?: string;
    cover?: string;
  };
  folder?: { name: string; path: string };
}

export interface PluginOutput {
  // Track-level
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  duration?: number;
  year?: string | number;
  trackNo?: number;
  lyrics?: string;
  tags?: string[];
  cover?: { source: 'url' | 'local'; value: string };
  provider?: string;
  confidence?: number;
  raw?: Record<string, any>;

  // Album-level (enriches Album row when persisted via ImportService)
  albumDescription?: string;
  albumTags?: string[];

  // Artist-level (enriches Artist row when persisted via ImportService)
  artistDescription?: string;
  artistTags?: string[];
}

export interface EnrichContext {
  cachePath: string;
  audioBasePath?: string;
  audioUrl?: string;
  folderId?: number | null;
  hash?: string;
}

interface PluginConfigFile {
  plugins?: PluginConfig[];
}

const DEFAULT_TIMEOUT = 30000;

@Injectable()
export class MetadataPluginService implements OnModuleInit {
  private readonly logger = new Logger(MetadataPluginService.name);
  private readonly prisma = new PrismaClient();
  private configs: PluginConfig[] = [];
  private configPath: string;

  constructor() {
    this.configPath = path.resolve(
      process.env.METADATA_PLUGINS_CONFIG || 'metadata-plugins.json',
    );
  }

  async onModuleInit() {
    await this.loadConfig();
  }

  async reload(): Promise<void> {
    await this.loadConfig();
  }

  listConfigs(): PluginConfig[] {
    return this.configs.map((c) => ({ ...c }));
  }

  async enrich(
    item: ScanResult,
    type: TrackType,
    context: EnrichContext,
  ): Promise<ScanResult> {
    if (this.configs.length === 0) {
      return item;
    }

    const matched = this.configs
      .filter((p) => p.enabled && this.matchesFilter(p, item, type))
      .sort((a, b) => a.priority - b.priority);

    if (matched.length === 0) {
      return item;
    }

    const input = this.buildPluginInput(item, type, context);
    let enriched: ScanResult = { ...item };
    const appliedPluginIds: string[] = [];

    for (const plugin of matched) {
      const startTime = Date.now();
      try {
        const output = await this.executePlugin(plugin, input);
        const durationMs = Date.now() - startTime;

        if (output) {
          enriched = await this.mergeOutput(
            enriched,
            output,
            context.cachePath,
          );
          appliedPluginIds.push(plugin.id);
          await this.logPluginCall(
            plugin,
            input,
            output,
            'success',
            durationMs,
          );
        }
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const message = error instanceof Error ? error.message : String(error);
        const status = this.isTimeoutError(error) ? 'timeout' : 'error';
        this.logger.warn(
          `Plugin ${plugin.id} failed for ${input.path}: ${message}`,
        );
        await this.logPluginCall(
          plugin,
          input,
          null,
          status,
          durationMs,
          message,
        );
      }
    }

    // Tag the enriched result so ImportService knows where metadata came from
    if (appliedPluginIds.length > 0) {
      (enriched as any).__metadataSource = MetadataSource.PLUGIN;
      (enriched as any).__metadataProvider = appliedPluginIds.join(',');
    }

    return enriched;
  }

  private async loadConfig(): Promise<void> {
    if (!fs.existsSync(this.configPath)) {
      this.configs = [];
      this.logger.log(
        `No metadata plugin config found at ${this.configPath}. Skipping plugin enrich.`,
      );
      return;
    }

    try {
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      const parsed: PluginConfigFile = JSON.parse(raw);
      this.configs = (parsed.plugins || []).map((p) => this.normalizeConfig(p));
      this.logger.log(
        `Loaded ${this.configs.length} metadata plugin config(s) from ${this.configPath}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to load metadata plugin config from ${this.configPath}:`,
        error,
      );
      this.configs = [];
    }
  }

  private normalizeConfig(config: PluginConfig): PluginConfig {
    return {
      ...config,
      enabled: config.enabled !== false,
      priority: config.priority ?? 0,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      retry: config.retry ?? 0,
    };
  }

  private matchesFilter(
    plugin: PluginConfig,
    item: ScanResult,
    type: TrackType,
  ): boolean {
    const filter = plugin.filter;
    if (!filter) return true;

    if (filter.types && filter.types.length > 0) {
      const typeStr = this.trackTypeToString(type);
      if (!filter.types.includes(typeStr)) {
        return false;
      }
    }

    if (filter.pathPattern) {
      try {
        const regex = new RegExp(filter.pathPattern);
        if (!regex.test(item.path) && !regex.test(item.originalPath || '')) {
          return false;
        }
      } catch {
        this.logger.warn(`Invalid pathPattern in plugin ${plugin.id}`);
        return false;
      }
    }

    return true;
  }

  private trackTypeToString(type: TrackType): 'music' | 'audiobook' | 'mv' {
    switch (type) {
      case TrackType.AUDIOBOOK:
        return 'audiobook';
      default:
        return 'music';
    }
  }

  private buildPluginInput(
    item: ScanResult,
    type: TrackType,
    context: EnrichContext,
  ): PluginInput {
    const fileName = path.basename(item.originalPath || item.path);
    const relativePath =
      context.audioBasePath && !item.path.startsWith('http')
        ? path.relative(context.audioBasePath, item.originalPath || item.path)
        : undefined;

    return {
      path: item.path,
      originalPath: item.originalPath,
      fileName,
      relativePath: relativePath || undefined,
      fileHash: context.hash,
      size: item.size ?? 0,
      mtime: item.mtime,
      type: this.trackTypeToString(type),
      metadata: {
        title: item.title,
        artist: item.artist,
        album: item.album,
        albumArtist: item.albumArtist,
        duration: item.duration,
        year: item.year,
        trackNo: item.track?.no,
        lyrics: item.lyrics,
        cover: item.coverPath,
      },
    };
  }

  private async executePlugin(
    plugin: PluginConfig,
    input: PluginInput,
  ): Promise<PluginOutput | null> {
    switch (plugin.type) {
      case 'http':
        return this.executeHttpPlugin(plugin, input);
      case 'executable':
        throw new Error('Executable plugins are not supported yet');
      case 'builtin':
        throw new Error('Built-in plugins are not supported yet');
      default:
        throw new Error(`Unsupported plugin type: ${plugin.type}`);
    }
  }

  private async executeHttpPlugin(
    plugin: PluginConfig,
    input: PluginInput,
  ): Promise<PluginOutput | null> {
    if (!plugin.endpoint) {
      throw new Error(`HTTP plugin ${plugin.id} missing endpoint`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), plugin.timeout);

    try {
      const response = await fetch(plugin.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const output = (await response.json()) as PluginOutput;
      return output;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  private async mergeOutput(
    item: ScanResult,
    output: PluginOutput,
    cachePath: string,
  ): Promise<ScanResult> {
    const merged: ScanResult = { ...item };

    if (output.title !== undefined) merged.title = output.title;
    if (output.artist !== undefined) merged.artist = output.artist;
    if (output.album !== undefined) merged.album = output.album;
    if (output.albumArtist !== undefined)
      merged.albumArtist = output.albumArtist;
    if (output.duration !== undefined) merged.duration = output.duration;
    if (output.year !== undefined)
      merged.year =
        typeof output.year === 'number'
          ? output.year
          : parseInt(output.year, 10) || undefined;
    if (output.trackNo !== undefined) {
      merged.track = { ...(merged.track || {}), no: output.trackNo };
    }
    if (output.lyrics !== undefined) merged.lyrics = output.lyrics;
    if (output.tags !== undefined && output.tags.length > 0) {
      (merged as any).__trackTags = this.mergeTagLists(
        (merged as any).__trackTags,
        output.tags,
      );
    }

    if (output.cover) {
      this.logger.log(`[plugin] cover source=${output.cover.source} url=${output.cover.value.slice(0, 60)}... cachePath=${cachePath}`);
      if (output.cover.source === 'url') {
        const downloadedPath = await this.downloadCover(
          output.cover.value,
          cachePath,
        );
        this.logger.log(`[plugin] cover download result: ${downloadedPath ?? 'null'}`);
        if (downloadedPath) {
          merged.coverPath = downloadedPath;
        }
      } else if (output.cover.source === 'local') {
        merged.coverPath = output.cover.value;
      }
    }
    this.logger.log(`[plugin] merged.coverPath=${merged.coverPath ?? 'undefined'}`);

    // Album-level enrichment: first plugin wins for description, tags are union-merged
    if (output.albumDescription !== undefined) {
      if (!(merged as any).__albumDescription) {
        (merged as any).__albumDescription = output.albumDescription;
      }
    }
    if (output.albumTags !== undefined && output.albumTags.length > 0) {
      (merged as any).__albumTags = this.mergeTagLists(
        (merged as any).__albumTags,
        output.albumTags,
      );
    }

    // Artist-level enrichment
    if (output.artistDescription !== undefined) {
      if (!(merged as any).__artistDescription) {
        (merged as any).__artistDescription = output.artistDescription;
      }
    }
    if (output.artistTags !== undefined && output.artistTags.length > 0) {
      (merged as any).__artistTags = this.mergeTagLists(
        (merged as any).__artistTags,
        output.artistTags,
      );
    }

    return merged;
  }

  private mergeTagLists(existing: string[] | undefined, incoming: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const t of [...(existing ?? []), ...incoming]) {
      const v = (t ?? '').trim();
      if (!v) continue;
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(v);
    }
    return result;
  }

  private async downloadCover(
    url: string,
    cachePath: string,
  ): Promise<string | null> {
    try {
      // Handle data: URLs (e.g. data:image/png;base64,XXX) emitted by mock
      // or in-process generators. Node's global fetch does not accept them.
      const dataMatch = url.match(/^data:([^;,]+);base64,(.+)$/);
      const buffer = dataMatch
        ? Buffer.from(dataMatch[2], 'base64')
        : await this.fetchAsBuffer(url);
      const mime = dataMatch ? dataMatch[1] : '';
      const ext = this.mimeToExt(mime) || 'jpg';
      const hash = crypto.createHash('md5').update(url).digest('hex');
      // Save directly into the cache root (flat, alongside embedded covers) so the static
      // server exposes it at /covers/<hash>.<ext> without an extra subdirectory.
      if (!fs.existsSync(cachePath)) {
        fs.mkdirSync(cachePath, { recursive: true });
      }
      const savePath = path.join(cachePath, `${hash}.${ext}`);

      fs.writeFileSync(savePath, buffer);
      return savePath;
    } catch (error) {
      this.logger.warn(`Failed to download cover from ${url}: ${error}`);
      return null;
    }
  }

  private async fetchAsBuffer(url: string): Promise<Buffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } finally {
      clearTimeout(timeout);
    }
  }

  private mimeToExt(mime: string): string | null {
    if (mime.includes('image/png')) return 'png';
    if (mime.includes('image/webp')) return 'webp';
    if (mime.includes('image/jpeg') || mime.includes('image/jpg')) return 'jpg';
    return null;
  }

  private async logPluginCall(
    plugin: PluginConfig,
    input: PluginInput,
    output: PluginOutput | null,
    status: 'success' | 'timeout' | 'error' | 'skipped',
    durationMs: number,
    message?: string,
  ): Promise<void> {
    try {
      await this.prisma.pluginLog.create({
        data: {
          pluginId: plugin.id,
          pluginName: plugin.name,
          targetPath: input.path,
          targetType: input.type,
          input: JSON.stringify(input),
          output: output ? JSON.stringify(output) : null,
          status,
          durationMs,
          message,
        },
      });
    } catch (error) {
      this.logger.error('Failed to write plugin log:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD helpers used by the admin "plugin center" page on the three clients.
  // ---------------------------------------------------------------------------

  getConfigPath(): string {
    return this.configPath;
  }

  list(): PluginConfig[] {
    return this.configs.map((c) => ({ ...c }));
  }

  async saveAll(plugins: PluginConfig[]): Promise<PluginConfig[]> {
    const normalized = (plugins || []).map((p) => this.normalizeConfig(p));
    await this.writeConfigFile(normalized);
    this.configs = normalized;
    this.logger.log(
      `Saved ${this.configs.length} metadata plugin config(s) to ${this.configPath}`,
    );
    return this.list();
  }

  async create(input: PluginConfig): Promise<PluginConfig> {
    if (!input || !input.id || !input.name) {
      throw new Error('插件 id 和 name 必填');
    }
    if (this.configs.some((c) => c.id === input.id)) {
      throw new Error(`插件 id 已存在: ${input.id}`);
    }
    const next = [...this.configs, this.normalizeConfig(input)];
    await this.writeConfigFile(next);
    this.configs = next;
    this.logger.log(`Added metadata plugin ${input.id}`);
    return this.normalizeConfig(input);
  }

  async update(
    id: string,
    patch: Partial<PluginConfig>,
  ): Promise<PluginConfig> {
    const idx = this.configs.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error(`插件不存在: ${id}`);
    }
    if (patch.id && patch.id !== id) {
      throw new Error('不允许修改插件 id，请删除后重新创建');
    }
    const merged = this.normalizeConfig({ ...this.configs[idx], ...patch, id });
    const next = [...this.configs];
    next[idx] = merged;
    await this.writeConfigFile(next);
    this.configs = next;
    this.logger.log(`Updated metadata plugin ${id}`);
    return merged;
  }

  async remove(id: string): Promise<void> {
    const next = this.configs.filter((c) => c.id !== id);
    if (next.length === this.configs.length) {
      throw new Error(`插件不存在: ${id}`);
    }
    await this.writeConfigFile(next);
    this.configs = next;
    this.logger.log(`Removed metadata plugin ${id}`);
  }

  private async writeConfigFile(plugins: PluginConfig[]): Promise<void> {
    const payload: PluginConfigFile = { plugins };
    const json = JSON.stringify(payload, null, 2);
    await fs.promises.writeFile(this.configPath, json, 'utf-8');
  }

  private isTimeoutError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.name === 'AbortError' ||
        error.message.includes('abort') ||
        error.message.includes('timeout')
      );
    }
    return false;
  }
}
