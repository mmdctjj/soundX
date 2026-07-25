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
} from '../common/mount-paths';
import { splitPathList } from '../common/path-list';

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
  private existsCache: { key: string; value: Record<keyof FileSources, boolean[]> } | null = null;

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
    // Env values (e.g. MUSIC_BASE_DIR=/music) are container-side; translate
    // them to host-side paths so the DB stores the user-facing form.
    return [raw].map((p) => bindContainerToHost(p));
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
