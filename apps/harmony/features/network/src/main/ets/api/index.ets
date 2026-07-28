export { authApi } from './auth';
export { userApi } from './user';
export { trackApi } from './track';
export { albumApi } from './album';
export { artistApi } from './artist';
export { playlistApi } from './playlist';
export { collectionApi } from './collection';
export { mvApi } from './mv';
export { userDataApi } from './userData';

export type { LoginDto, RegisterDto, AuthMe, LoginResponse, CheckResponse, AuthApi } from './auth';
export type { UserItem, UserApi } from './user';
export type {
  TrackDto, LikedByUser, PlaybackQuality, TrackApi,
  TrackLoadMoreParams, TrackSearchParams, TrackLatestParams,
} from './track';
export type {
  AlbumDto, AlbumDetailResp, AlbumListResp, AlbumApi,
  AlbumLoadMoreParams, AlbumLatestParams, AlbumRecommendParams,
} from './album';
export type {
  ArtistDto, ArtistDetailResp, ArtistApi,
  ArtistLoadMoreParams, ArtistLatestParams,
} from './artist';
export type { PlaylistDto, PlaylistDetailResp, PlaylistApi } from './playlist';
export type {
  CollectionDto, CollectionDetailResp, CollectionAlbumItem, CollectionApi,
} from './collection';
export type { MVDto, MVListParams, MVApi } from './mv';
export type {
  UserDataApi, LoadMoreQuery,
  TrackLikeItem, AlbumLikeItem, TrackHistoryItem, AlbumHistoryItem,
} from './userData';
