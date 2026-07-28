export { HarmonyHttpClient, httpClient } from './src/main/ets/HarmonyHttpClient';
export { HttpError } from './src/main/ets/HttpError';
export { authApi, userApi, trackApi, albumApi, artistApi, playlistApi, collectionApi, mvApi, userDataApi }
  from './src/main/ets/api';
export type {
  RequestConfig, HttpResponse,
  BackendEnvelope, LoadMoreResp, TableResp,
  RequestInterceptor, ResponseInterceptor, ErrorInterceptor,
} from './src/main/ets/types';
export type { LoginDto, RegisterDto, AuthMe, LoginResponse, CheckResponse, UserItem }
  from './src/main/ets/api';
export type { AuthApi, UserApi } from './src/main/ets/api';
export type {
  TrackDto, LikedByUser, PlaybackQuality, TrackApi,
  TrackLoadMoreParams, TrackSearchParams, TrackLatestParams,
} from './src/main/ets/api';
export type {
  AlbumDto, AlbumTracksResp, AlbumListResp, AlbumApi,
  AlbumLoadMoreParams, AlbumLatestParams, AlbumRecommendParams,
} from './src/main/ets/api';
export type {
  ArtistDto, ArtistApi,
  ArtistLoadMoreParams, ArtistLatestParams,
} from './src/main/ets/api';
export type { PlaylistDto, PlaylistDetailResp, PlaylistApi } from './src/main/ets/api';
export type {
  CollectionDto, CollectionDetailResp, CollectionAlbumItem, CollectionApi,
} from './src/main/ets/api';
export type { MVDto, MVListParams, MVApi } from './src/main/ets/api';
export type {
  UserDataApi, LoadMoreQuery,
  TrackLikeItem, AlbumLikeItem, TrackHistoryItem, AlbumHistoryItem,
} from './src/main/ets/api';
