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
    // env seeding stores **original input strings** (possibly `;`-joined).
    // resolveDirs always does `path.resolve` per-item at read time.
    return {
      musicDirs: this.envOrDefault('MUSIC_BASE_DIR', DEFAULT_MUSIC_DIR),
      audiobookDirs: this.envOrDefault('AUDIO_BOOK_DIR', DEFAULT_AUDIOBOOK_DIR),
      mvDirs: this.envOrDefault('MV_BASE_DIR', DEFAULT_MV_DIR),
      txtDirs: process.env.TXT_BASE_DIR ? [process.env.TXT_BASE_DIR] : [],
    };
  }

  private envOrDefault(envKey: string, fallback: string): string[] {
    const raw = process.env[envKey];
    if (raw === undefined) return [fallback];
    if (raw === '') return [];
    return [raw];
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
