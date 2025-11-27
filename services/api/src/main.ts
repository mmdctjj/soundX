import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS
  app.enableCors();

  // Serve static files from cache directory
  // This allows accessing covers via http://localhost:3000/covers/filename.jpg
  // Default to packages/test/music/cover for development
  const cacheDir = process.env.CACHE_DIR || '/Users/bytedance/Documents/soundX/packages/test/music/cover';
  console.log(`Serving static files from: ${cacheDir}`);
  app.useStaticAssets(cacheDir, {
    prefix: '/covers/',
  });

  const config = new DocumentBuilder()
    .setTitle('SoundX API')
    .setDescription('SoundX API documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap()
  .then(() => console.log('success'))
  .catch((err) => console.log(err));
