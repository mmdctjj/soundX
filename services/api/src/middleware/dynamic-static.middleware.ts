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

    let rel: string;
    try {
      rel = decodeURIComponent(url.replace(/^\/(music|audio)\//, ''));
    } catch {
      return next();
    }

    for (const base of candidates) {
      const normalizedBase = path.resolve(base);
      const abs = path.resolve(normalizedBase, rel);
      // Path traversal guard
      if (!abs.startsWith(normalizedBase + path.sep) && abs !== normalizedBase) continue;

      try {
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
      } catch {
        // The file may disappear between existsSync and statSync; try the next base.
      }
    }
    next();
  }
}
