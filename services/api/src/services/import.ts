import { Injectable } from '@nestjs/common';
import { WebDavMusicScanner } from '@soundx/core';
import { TrackType } from '@soundx/db';
import { randomUUID } from 'crypto';
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

  constructor(private readonly trackService: TrackService) { }

  createTask(username: string, password: string, webdavUrl: string): string {
    const id = randomUUID();
    this.tasks.set(id, { id, status: TaskStatus.INITIALIZING });

    // Start async import
    this.startImport(id, username, password, webdavUrl).catch(err => {
      console.error("Unhandled import error", err);
    });

    return id;
  }

  getTask(id: string): ImportTask | undefined {
    return this.tasks.get(id);
  }

  private async startImport(id: string, username: string, password: string, webdavUrl: string) {
    const task = this.tasks.get(id);
    if (!task) return;

    try {
      const scanner = new WebDavMusicScanner(webdavUrl, "", username, password);

      task.status = TaskStatus.PARSING;

      const results = await scanner.scanAllMusic("/");

      task.total = results.length;
      task.current = 0;

      for (const item of results) {
        // Construct full URL for the track
        const baseUrl = webdavUrl.endsWith('/') ? webdavUrl.slice(0, -1) : webdavUrl;
        const fullPath = baseUrl + item.path;

        // For cover, if it's a relative path starting with /, append to baseUrl
        let coverUrl = item.coverPath;
        if (coverUrl && coverUrl.startsWith('/')) {
          coverUrl = baseUrl + coverUrl;
        }

        await this.trackService.createTrack({
          name: item.title || item.path.split('/').pop() || 'Unknown',
          artist: item.artist || 'Unknown',
          album: item.album || 'Unknown',
          cover: coverUrl,
          path: fullPath,
          duration: Math.round(item.duration || 0),
          type: TrackType.MUSIC,
          createdAt: new Date(),
        });
        task.current++;
      }

      task.status = TaskStatus.SUCCESS;
    } catch (error) {
      console.error('Import failed:', error);
      task.status = TaskStatus.FAILED;
      task.message = error instanceof Error ? error.message : String(error);
    }
  }
}
