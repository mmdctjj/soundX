import * as fs from 'fs';
import * as music from 'music-metadata';
import * as path from 'path';

export interface ScanResult {
  path: string;
  size: number;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  coverPath?: string;
  [key: string]: any;
}

export class LocalMusicScanner {
  constructor(private cacheDir: string) {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  async scanMusic(dir: string): Promise<ScanResult[]> {
    const results: ScanResult[] = [];
    if (!fs.existsSync(dir)) return results;

    await this.traverse(dir, async (filePath) => {
      const metadata = await this.parseFile(filePath);
      if (metadata) {
        results.push(metadata);
      }
    });
    return results;
  }

  async scanAudiobook(dir: string): Promise<ScanResult[]> {
    const results: ScanResult[] = [];
    if (!fs.existsSync(dir)) return results;

    await this.traverse(dir, async (filePath) => {
      const metadata = await this.parseFile(filePath);
      if (metadata) {
        // Override album with parent folder name
        const parentDir = path.dirname(filePath);
        const folderName = path.basename(parentDir);
        metadata.album = folderName;
        results.push(metadata);
      }
    });
    return results;
  }

  private async traverse(dir: string, callback: (path: string) => Promise<void>) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            await this.traverse(fullPath, callback);
          } else if (/\.(mp3|flac|ogg|wav|m4a)$/i.test(file)) {
            await callback(fullPath);
          }
        } catch (e) {
          console.warn(`Skipping file ${fullPath}: ${e}`);
        }
      }
    } catch (e) {
      console.warn(`Failed to read dir ${dir}: ${e}`);
    }
  }

  private async parseFile(filePath: string): Promise<ScanResult | null> {
    try {
      const metadata = await music.parseFile(filePath);
      const common = metadata.common;

      let coverPath = null;
      if (common.picture && common.picture.length > 0) {
        const picture = common.picture[0];
        const ext = picture.format.split('/')[1] || 'jpg';
        const fileName = path.basename(filePath);
        // Cover name consistent with file name
        const coverName = `${fileName}.${ext}`;
        const savePath = path.join(this.cacheDir, coverName);

        fs.writeFileSync(savePath, picture.data);
        coverPath = savePath;
      }

      return {
        path: filePath,
        size: fs.statSync(filePath).size,
        title: common.title,
        artist: common.artist,
        album: common.album,
        duration: metadata.format.duration,
        coverPath: coverPath || undefined,
        ...common
      };
    } catch (e) {
      console.error(`Failed to parse ${filePath}`, e);
      return null;
    }
  }
}

export default LocalMusicScanner;