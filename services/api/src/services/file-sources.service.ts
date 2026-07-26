import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@soundx/db';
import * as fs from 'fs';
import * as path from 'path';
import {
  DEFAULT_AUDIOBOOK_DIR,
  DEFAULT_MUSIC_DIR,
  DEFAULT_MV_DIR,
} from '../common/media-paths';
import {
  containerToHost as bindContainerToHost,
  hostToContainer as bindHostToContainer,
  registerHostPathPair,
} from '../common/mount-paths';
import { splitPathList } from '../common/path-list';

const SETTING_KEY = 'file_sources';

/**
 * Pairs of (container env, host env). `*_HOST` values, when set, override the
 * mountinfo-derived host path for that media kind. Needed on NAS hosts
 * (Synology btrfs under /volume1) where mountinfo only shows paths relative
 * to the superblock root.
 */
const HOST_ENV_PAIRS: Array<{
  container: keyof EnvVars;
  host: keyof EnvVars;
}> = [
  { container: 'MUSIC_BASE_DIR', host: 'MUSIC_BASE_DIR_HOST' },
  { container: 'AUDIO_BOOK_DIR', host: 'AUDIO_BOOK_DIR_HOST' },
  { container: 'MV_BASE_DIR', host: 'MV_BASE_DIR_HOST' },
  { container: 'TXT_BASE_DIR', host: 'TXT_BASE_DIR_HOST' },
];

interface EnvVars {
  MUSIC_BASE_DIR?: string;
  MUSIC_BASE_DIR_HOST?: string;
  AUDIO_BOOK_DIR?: string;
  AUDIO_BOOK_DIR_HOST?: string;
  MV_BASE_DIR?: string;
  MV_BASE_DIR_HOST?: string;
  TXT_BASE_DIR?: string;
  TXT_BASE_DIR_HOST?: string;
}

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
  private existsCache: { key: string; value: Record<keyof FileSources, boolean[]> } | null = null;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async onModuleInit() {
    // Register operator-declared host paths *before* anything that may call
    // hostToContainer. This runs unconditionally (not gated on DB miss) so
    // that paths saved via the UI in earlier deploys still reverse-resolve
    // when the runtime reads them through resolveDirs().
    this.registerHostEnvPairs();
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
    const key = JSON.stringify({
      musicDirs: resolved.musicDirs,
      audiobookDirs: resolved.audiobookDirs,
      mvDirs: resolved.mvDirs,
      txtDirs: resolved.txtDirs,
    });
    if (this.existsCache && this.existsCache.key === key) {
      return { sources, exists: this.existsCache.value };
    }
    const exists: Record<keyof FileSources, boolean[]> = {
      musicDirs: resolved.musicDirs.map((d) => fs.existsSync(d)),
      audiobookDirs: resolved.audiobookDirs.map((d) => fs.existsSync(d)),
      mvDirs: resolved.mvDirs.map((d) => fs.existsSync(d)),
      txtDirs: resolved.txtDirs.map((d) => fs.existsSync(d)),
    };
    this.existsCache = { key, value: exists };
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
    this.existsCache = null;
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
    // DB stores host-side paths (the user-friendly form for the settings UI);
    // reverse-translate to container-side paths so the runtime code (chokidar,
    // dynamic middleware, getFilePath) operates against the filesystem the api
    // process actually sees.
    return {
      musicDirs: sources.musicDirs.map((d) => bindHostToContainer(d)),
      audiobookDirs: sources.audiobookDirs.map((d) => bindHostToContainer(d)),
      mvDirs: sources.mvDirs.map((d) => bindHostToContainer(d)),
      txtDirs: sources.txtDirs.map((d) => bindHostToContainer(d)),
    };
  }

  private buildFromEnv(): FileSources {
    return {
      musicDirs: this.envOrDefault('MUSIC_BASE_DIR', DEFAULT_MUSIC_DIR, 'MUSIC_BASE_DIR_HOST'),
      audiobookDirs: this.envOrDefault('AUDIO_BOOK_DIR', DEFAULT_AUDIOBOOK_DIR, 'AUDIO_BOOK_DIR_HOST'),
      mvDirs: this.envOrDefault('MV_BASE_DIR', DEFAULT_MV_DIR, 'MV_BASE_DIR_HOST'),
      txtDirs: this.envOrDefault('TXT_BASE_DIR', '', 'TXT_BASE_DIR_HOST'),
    };
  }

  private envOrDefault(envKey: string, fallback: string, hostEnvKey: string): string[] {
    const raw = process.env[envKey];
    const hostRaw = process.env[hostEnvKey];
    if (raw === undefined) return fallback ? [fallback] : [];
    if (raw === '') return [];
    const containers = splitPathList(raw);
    if (containers.length === 0) return [];
    const hosts = hostRaw ? splitPathList(hostRaw) : [];
    return containers.map((containerPath, idx) => {
      // Explicit host wins (operator knows the real path; mountinfo can't see
      // /volume1 on Synology). Fall back to mountinfo translation; if that
      // also has no entry, keep the container path — UI will mark it red but
      // it's a more honest signal than silently dropping the entry.
      if (hosts[idx]) return hosts[idx];
      return bindContainerToHost(containerPath);
    });
  }

  /**
   * Push operator-declared host paths into the resolver. Called once on
   * startup so that subsequent resolveDirs() calls can reverse-resolve DB-
   * stored host paths back to their container-side equivalents.
   */
  private registerHostEnvPairs(): void {
    for (const { container, host } of HOST_ENV_PAIRS) {
      const containers = splitPathList(process.env[container]);
      const hosts = splitPathList(process.env[host]);
      if (containers.length === 0 || hosts.length === 0) continue;
      const len = Math.min(containers.length, hosts.length);
      for (let i = 0; i < len; i++) {
        if (containers[i] && hosts[i]) {
          registerHostPathPair(containers[i], hosts[i]);
        }
      }
    }
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
