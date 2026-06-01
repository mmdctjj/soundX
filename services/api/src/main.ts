import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

import { createProxyMiddleware } from 'http-proxy-middleware';
import { Logger } from 'nestjs-pino';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_AUDIOBOOK_DIR, DEFAULT_CACHE_DIR, DEFAULT_MUSIC_DIR, DEFAULT_MV_DIR } from './common/media-paths';
import { resolvePathList } from './common/path-list';
import { DatabaseSchemaService } from './services/database-schema.service';
import { ImportService } from './services/import';
import { TrackService } from './services/track';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Enable CORS
  app.enableCors();


  const cacheDir = path.resolve(process.env.CACHE_DIR || DEFAULT_CACHE_DIR);
  const transcodedAudioDir = path.join(cacheDir, 'transcoded-audio');
  const transcodedMvDir = path.join(cacheDir, 'transcoded-mv');
  const musicBaseDirs = resolvePathList(process.env.MUSIC_BASE_DIR, DEFAULT_MUSIC_DIR);
  const audioBookDirs = resolvePathList(process.env.AUDIO_BOOK_DIR, DEFAULT_AUDIOBOOK_DIR);
  const mvDirs = resolvePathList(process.env.MV_BASE_DIR, DEFAULT_MV_DIR);

  fs.mkdirSync(transcodedAudioDir, { recursive: true });
  fs.mkdirSync(transcodedMvDir, { recursive: true });


  // Serve static files from cache directory
  // This allows accessing covers via http://localhost:3000/covers/filename.jpg
  // Default to packages/test/music/cover for development
  console.log(`Serving static files from: ${cacheDir}`);
  app.useStaticAssets(cacheDir, {
    prefix: '/covers/',
    setHeaders: (res, filePath) => {
      res.set('Accept-Ranges', 'bytes');
      if (filePath.endsWith('.mp3')) res.set('Content-Type', 'audio/mpeg');
    },
  });

  // Serve music files
  console.log(`Serving music files from: ${musicBaseDirs.join(',')}`);
  for (const musicBaseDir of musicBaseDirs) {
    app.useStaticAssets(musicBaseDir, {
      prefix: '/music/',
      setHeaders: (res, path) => {
        res.set('Accept-Ranges', 'bytes');
      }
    });
  }

  // Serve audiobook files
  console.log(`Serving audiobook files from: ${audioBookDirs.join(',')}`);
  for (const audioBookDir of audioBookDirs) {
    app.useStaticAssets(audioBookDir, {
      prefix: '/audio/',
      setHeaders: (res, path) => {
        res.set('Accept-Ranges', 'bytes');
      }
    });
  }

  // Serve MV files
  console.log(`Serving MV files from: ${mvDirs.join(',')}`);
  for (const mvDir of mvDirs) {
    app.useStaticAssets(mvDir, {
      prefix: '/music/', // Since import.ts convertToHttpUrl maps MV files to /music/ prefix currently
      setHeaders: (res, path) => {
        res.set('Accept-Ranges', 'bytes');
        // Make sure proper video content type is returned
        if (path.endsWith('.mp4')) res.set('Content-Type', 'video/mp4');
        else if (path.endsWith('.webm')) res.set('Content-Type', 'video/webm');
        else if (path.endsWith('.mkv')) res.set('Content-Type', 'video/x-matroska');
      }
    });
  }

  console.log(`Serving transcoded MV files from: ${transcodedMvDir}`);
  app.useStaticAssets(transcodedMvDir, {
    prefix: '/music/',
    setHeaders: (res, path) => {
      res.set('Accept-Ranges', 'bytes');
      if (path.endsWith('.mp4')) res.set('Content-Type', 'video/mp4');
    }
  });

  // TTS Service Proxy
  const ttsServiceUrl = process.env.TTS_SERVICE_URL || 'http://localhost:8000';
  console.log(`Proxying /tts requests to: ${ttsServiceUrl}`);
  app.use(
    ['/tts', '/api/tts'],
    createProxyMiddleware({
      target: ttsServiceUrl,
      changeOrigin: true,
      pathRewrite: {
        '^/api/tts': '', // Remove /api/tts prefix
        '^/tts': '',     // Remove /tts prefix
      },
    }),
  );

  // ASR Service Proxy
  const asrServiceUrl = process.env.ASR_SERVICE_URL || 'http://localhost:3300';
  console.log(`Proxying /asr requests to: ${asrServiceUrl}`);
  app.use(
    ['/asr', '/api/asr'],
    createProxyMiddleware({
      target: asrServiceUrl,
      changeOrigin: true,
      pathRewrite: {
        '^/api/asr': '', // Remove /api/asr prefix
        '^/asr': '',     // Remove /asr prefix
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('AudioDock API')
    .setDescription('AudioDock API documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);


  // 启动完成后调用 service
  const databaseSchemaService = app.get(DatabaseSchemaService);
  await databaseSchemaService.ensureTrackSortColumns();

  const trackService = app.get(TrackService);
  const count = await trackService.trackCount();

  if (count === 0) {
    console.log('Database is empty, starting initial import...');
    const myService = app.get(ImportService);
    await myService.createTask(musicBaseDirs, audioBookDirs, mvDirs, cacheDir);
  } else {
    console.log(`Database has ${count} tracks, skipping initial import. Starting watcher...`);
    const myService = app.get(ImportService);
    myService.setupWatcher(musicBaseDirs, audioBookDirs, mvDirs, cacheDir);
  }

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap()
  .then(() => console.log('success'))
  .catch((err) => console.log(err));
