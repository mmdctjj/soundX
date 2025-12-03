import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

import { Logger } from 'nestjs-pino';
import * as path from 'path';
import { ImportService } from './services/import';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Enable CORS
  app.enableCors();


  const cacheDir = path.resolve(process.env.VITE_CACHE || './');
  const musicBaseDir = path.resolve(process.env.VITE_MUSIC_BASE_DIR || './');
  const audioBookDir = path.resolve(process.env.VITE_AUDIO_BOOK || './');


  // Serve static files from cache directory
  // This allows accessing covers via http://localhost:3000/covers/filename.jpg
  // Default to packages/test/music/cover for development
  console.log(`Serving static files from: ${cacheDir}`);
  app.useStaticAssets(cacheDir, {
    prefix: '/covers/',
  });

  // Serve audio files from music parent directory
  // This allows accessing audio via http://localhost:3000/audio/relative/path/to/file.m4a
  // The music directory contains both 'music' and 'audio' subdirectories
  console.log(`Serving audio files from: ${musicBaseDir}`);
  app.useStaticAssets(musicBaseDir, {
    prefix: '/audio/',
  });

  const config = new DocumentBuilder()
    .setTitle('SoundX API')
    .setDescription('SoundX API documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);


  // 启动完成后调用 service
  const myService = app.get(ImportService); // 替换成你要调用的 service
  await myService.createTask(musicBaseDir, audioBookDir, cacheDir); // 调用 service 方法

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap()
  .then(() => console.log('success'))
  .catch((err) => console.log(err));
