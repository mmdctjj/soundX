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
import { UserAlbumHistoryController } from './controllers/user-album-history';
import { UserAlbumLikeController } from './controllers/user-album-like';
import { UserTrackHistoryController } from './controllers/user-track-history';
import { UserTrackLikeController } from './controllers/user-track-like';
import { UserAudiobookHistoryController } from './controllers/user-audiobook-history';
import { UserAudiobookLikeController } from './controllers/user-audiobook-like';
import { UserAlbumHistoryService } from './services/user-album-history';
import { UserAlbumLikeService } from './services/user-album-like';
import { UserAudiobookHistoryService } from './services/user-audiobook-history';
import { UserAudiobookLikeService } from './services/user-audiobook-like';
import { UserTrackHistoryService } from './services/user-track-history';
import { UserTrackLikeService } from './services/user-track-like';

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
    UserAlbumHistoryController,
    UserAlbumLikeController,
    UserAudiobookHistoryController,
    UserAudiobookLikeController,
    UserTrackHistoryController,
    UserTrackLikeController,
  ],
  providers: [
    UserService,
    AuthService,
    AlbumService,
    ArtistService,
    TrackService,
    UserAlbumHistoryService,
    UserAlbumLikeService,
    UserAudiobookHistoryService,
    UserAudiobookLikeService,
    UserTrackHistoryService,
    UserTrackLikeService,
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
