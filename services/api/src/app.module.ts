import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AlbumController } from './controllers/album';
import { ArtistController } from './controllers/artist';
import { AudiobookController } from './controllers/audiobook';
import { ImportController } from './controllers/import';
import { TrackController } from './controllers/track';
import { UserController } from './controllers/user';
import { UserAlbumHistoryController } from './controllers/user-album-history';
import { UserAlbumLikeController } from './controllers/user-album-like';
import { UserAudiobookHistoryController } from './controllers/user-audiobook-history';
import { UserAudiobookLikeController } from './controllers/user-audiobook-like';
import { UserTrackHistoryController } from './controllers/user-track-history';
import { UserTrackLikeController } from './controllers/user-track-like';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { AlbumService } from './services/album';
import { ArtistService } from './services/artist';
import { AudiobookService } from './services/audiobook';
import { ImportService } from './services/import';
import { TrackService } from './services/track';
import { UserService } from './services/user';
import { UserAlbumHistoryService } from './services/user-album-history';
import { UserAlbumLikeService } from './services/user-album-like';
import { UserAudiobookHistoryService } from './services/user-audiobook-history';
import { UserAudiobookLikeService } from './services/user-audiobook-like';
import { UserTrackHistoryService } from './services/user-track-history';
import { UserTrackLikeService } from './services/user-track-like';

@Module({
  imports: [
    ConfigModule.forRoot(),
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
    AudiobookController,
    ImportController,
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
    ImportService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    AudiobookService,
  ],
})
export class AppModule { }
