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
