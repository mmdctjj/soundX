import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { UserController } from './controllers/user';
import { UserService } from './services/user';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AlbumService } from './services/album';
import { ArtistService } from './services/artist';
import { TrackService } from './services/track';
import { AlbumController } from './controllers/album';
import { ArtistController } from './controllers/artist';
import { TrackController } from './controllers/track';

@Module({
  imports: [
    ConfigModule.forRoot(), // 自动读取 .env 文件
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [
    UserController,
    AuthController,
    AlbumController,
    ArtistController,
    TrackController,
  ],
  providers: [
    UserService,
    AuthService,
    AlbumService,
    ArtistService,
    TrackService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
