import { Injectable } from '@nestjs/common';
import { TrackType } from '@soundx/db';
import { LocalMusicScanner } from '@soundx/utils';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { AlbumService } from './album';
import { ArtistService } from './artist';
import { TrackService } from './track';

export enum TaskStatus {
  INITIALIZING = 'INITIALIZING',
  PARSING = 'PARSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface ImportTask {
  id: string;
  status: TaskStatus;
  message?: string;
  total?: number;
  current?: number;
}

@Injectable()
export class ImportService {
  private tasks: Map<string, ImportTask> = new Map();

  constructor(
    private readonly trackService: TrackService,
    private readonly albumService: AlbumService,
    private readonly artistService: ArtistService,
  ) { }

  createTask(musicPath: string, audiobookPath: string, cachePath: string): string {
    const id = randomUUID();
    this.tasks.set(id, { id, status: TaskStatus.INITIALIZING });

    this.startImport(id, musicPath, audiobookPath, cachePath).catch(err => {
      console.error("Unhandled import error", err);
    });

    return id;
  }

  getTask(id: string): ImportTask | undefined {
    return this.tasks.get(id);
  }

  private convertToHttpUrl(localPath: string, cachePath: string): string {
    // Extract filename from local path
    const filename = path.basename(localPath);
    // Convert to HTTP URL
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/covers/${filename}`;
  }

  private async startImport(id: string, musicPath: string, audiobookPath: string, cachePath: string) {
    const task = this.tasks.get(id);
    if (!task) return;

    try {
      const scanner = new LocalMusicScanner(cachePath);

      task.status = TaskStatus.PARSING;

      // Scan Music
      const musicResults = await scanner.scanMusic(musicPath);
      console.log("musicResults", musicResults);
      // Scan Audiobooks
      const audiobookResults = await scanner.scanAudiobook(audiobookPath);
      console.log("audiobookResults", audiobookResults);

      task.total = musicResults.length + audiobookResults.length;
      task.current = 0;

      const processItem = async (item: any, type: TrackType) => {
        const artistName = item.artist || 'Unknown Artist';
        const albumName = item.album || 'Unknown Album';

        // Convert local cover path to HTTP URL
        const coverUrl = item.coverPath ? this.convertToHttpUrl(item.coverPath, cachePath) : null;

        // 1. Handle Artist
        let artist = await this.artistService.findByName(artistName);
        if (!artist) {
          artist = await this.artistService.createArtist({ name: artistName, avatar: null });
        }

        // 2. Handle Album
        let album = await this.albumService.findByName(albumName, artistName, type);
        if (!album) {
          album = await this.albumService.createAlbum({
            name: albumName,
            artist: artistName,
            cover: coverUrl,
            year: item.year ? String(item.year) : null,
            type: type
          });
        }

        // 3. Create Track
        await this.trackService.createTrack({
          name: item.title || path.basename(item.path),
          artist: artistName,
          album: albumName,
          cover: coverUrl,
          path: item.path,
          duration: Math.round(item.duration || 0),
          type: type,
          createdAt: new Date(),
        });
        task.current = (task.current || 0) + 1;
      };

      // Save Music
      for (const item of musicResults) {
        await processItem(item, TrackType.MUSIC);
      }

      // Save Audiobooks
      for (const item of audiobookResults) {
        await processItem(item, TrackType.AUDIOBOOK);
      }

      task.status = TaskStatus.SUCCESS;
    } catch (error) {
      console.error('Import failed:', error);
      task.status = TaskStatus.FAILED;
      task.message = error instanceof Error ? error.message : String(error);
    }
  }
}
