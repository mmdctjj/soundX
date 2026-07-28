import router from '@ohos.router';
import { AppIcon } from '../components/AppIcon';
import { CoverImage } from '../components/CoverImage';
import { storage } from '../utils/StorageManager';
import { httpClient } from '../utils/HttpClient';
import { t } from 'features_i18n';
import {
  getArtistList,
  loadMoreAlbum,
  loadMoreTrack,
  Artist,
  Album,
  Track,
  LikeUser,
  getCollections,
  getMvList
} from '../utils/ApiService';

class TabInfo {
  key: string = '';
  label: string = '';
  showInMusic: boolean = true;
  showInAudiobook: boolean = true;

  constructor(key: string, label: string, showInMusic: boolean, showInAudiobook: boolean) {
    this.key = key;
    this.label = label;
    this.showInMusic = showInMusic;
    this.showInAudiobook = showInAudiobook;
  }
}

class TrackData implements Track {
  id: number | string = '';
  name: string = '';
  artist: string = '';
  cover: string = '';
  album: string = '';
  liked: boolean = false;
  likedByUsers: Array<LikeUser> = [];
}

class ArtistData implements Artist {
  id: number | string = '';
  name: string = '';
  avatar: string = '';
  cover: string = '';
}

class AlbumData implements Album {
  id: number | string = '';
  name: string = '';
  artist: string = '';
  cover: string = '';
  type: string = '';
  progress: number = 0;
  resumeTrackId: number | string = '';
  resumeProgress: number = 0;
}

class LikeUserData implements LikeUser {
  userId: number | string = '';
}

@Component
export struct LibraryTab {
  @State mode: string = 'MUSIC';
  @State activeTab: string = 'artists';
  @State loading: boolean = true;
  @State tracks: Track[] = [];
  @State artists: Artist[] = [];
  @State albums: Album[] = [];
  @State collections: Array<Record<string, Object>> = [];
  @State mvs: Array<Record<string, Object>> = [];
  @State userId: string = '';
  @State tabCounts: Record<string, number> = {};

  aboutToAppear() {
    this.initData();
  }

  async initData() {
    try {
      const savedAddress = await storage.getItem('serverAddress');
      const savedToken = savedAddress ? await storage.getItem('token_' + savedAddress) : null;
      const savedUser = await storage.getItem('currentUser');

      if (savedAddress) {
        httpClient.setBaseURL(savedAddress);
      }
      if (savedToken) {
        httpClient.setToken(savedToken);
      }
      if (savedUser) {
        const user = JSON.parse(savedUser) as Record<string, Object>;
        this.userId = String(user['id'] || '');
      }

      const savedMode = await storage.getItem('playMode');
      if (savedMode) {
        this.mode = savedMode;
      }
    } catch (e) {
      console.error('Failed to init library data:', e);
    }

    this.loadAllData();
  }

  async loadAllData() {
    this.loading = true;

    try {
      const counts: Record<string, number> = new Object() as Record<string, number>;

      if (this.mode === 'MUSIC') {
        const trackParams: Record<string, string> = new Object() as Record<string, string>;
        trackParams['pageSize'] = '1';
        trackParams['loadCount'] = '0';
        trackParams['type'] = 'MUSIC';

        const artistParams: Record<string, string> = new Object() as Record<string, string>;
        artistParams['pageSize'] = '1';
        artistParams['loadCount'] = '0';
        artistParams['type'] = 'MUSIC';

        const albumParams: Record<string, string> = new Object() as Record<string, string>;
        albumParams['pageSize'] = '1';
        albumParams['loadCount'] = '0';
        albumParams['type'] = 'MUSIC';

        const promiseResults = await Promise.all([
          loadMoreTrack(trackParams),
          getArtistList(1, 0, 'MUSIC', undefined),
          loadMoreAlbum(albumParams),
          getMvList(1, 0)
        ]);

        const trackRes = promiseResults[0] as Record<string, Object>;
        const artistRes = promiseResults[1] as Record<string, Object>;
        const albumRes = promiseResults[2] as Record<string, Object>;
        const mvRes = promiseResults[3] as Record<string, Object>;

        if (trackRes['code'] === 200 && trackRes['data']) {
          const dataObj = trackRes['data'] as Record<string, Object>;
          counts['songs'] = dataObj.total as number || (dataObj.list as Array<Object>).length || 0;
        }

        if (artistRes['code'] === 200 && artistRes['data']) {
          const dataObj = artistRes['data'] as Record<string, Object>;
          counts['artists'] = dataObj.total as number || (dataObj.list as Array<Object>).length || 0;
        }

        if (albumRes['code'] === 200 && albumRes['data']) {
          const dataObj = albumRes['data'] as Record<string, Object>;
          counts['albums'] = dataObj.total as number || (dataObj.list as Array<Object>).length || 0;
        }

        if (mvRes && mvRes['list']) {
          const mvList = mvRes['list'] as Array<Object>;
          counts['mvs'] = mvList.length || 0;
        }

        this.tabCounts = counts;
        await this.loadTabData();
      } else {
        const artistRes = await getArtistList(1, 0, 'AUDIOBOOK', undefined) as Record<string, Object>;
        const abAlbumParams: Record<string, string> = new Object() as Record<string, string>;
        abAlbumParams['pageSize'] = '1';
        abAlbumParams['loadCount'] = '0';
        abAlbumParams['type'] = 'AUDIOBOOK';
        const albumRes = await loadMoreAlbum(abAlbumParams) as Record<string, Object>;
        let collectionRes: Record<string, Object> = new Object() as Record<string, Object>;
        if (this.userId.length > 0) {
          collectionRes = await getCollections(this.userId) as Record<string, Object>;
        }

        if (artistRes['code'] === 200 && artistRes['data']) {
          const dataObj = artistRes['data'] as Record<string, Object>;
          counts['artists'] = dataObj.total as number || (dataObj.list as Array<Object>).length || 0;
        }

        if (albumRes['code'] === 200 && albumRes['data']) {
          const dataObj = albumRes['data'] as Record<string, Object>;
          counts['albums'] = dataObj.total as number || (dataObj.list as Array<Object>).length || 0;
        }

        if (collectionRes['code'] === 200 && collectionRes['data']) {
          const colData = collectionRes['data'] as Array<Object>;
          counts['collections'] = colData.length || 0;
        }

        this.tabCounts = counts;
        await this.loadTabData();
      }
    } catch (error) {
      console.error('Failed to load library counts:', error);
    }
  }

  async loadTabData() {
    this.loading = true;

    try {
      if (this.activeTab === 'songs' && this.mode === 'MUSIC') {
        const trackParams2: Record<string, string> = new Object() as Record<string, string>;
        trackParams2['pageSize'] = '200';
        trackParams2['loadCount'] = '0';
        trackParams2['type'] = 'MUSIC';
        const res = await loadMoreTrack(trackParams2);
        const data = res as Record<string, Object>;
        if (data['code'] === 200 && data['data']) {
          const dataObj = data['data'] as Record<string, Object>;
          const list = dataObj['list'] as Array<Record<string, Object>>;
          const mapped: Track[] = [];
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const track = new TrackData();
            track.id = item.id as number | string || '';
            track.name = item.name as string || '';
            track.artist = item.artist as string || '';
            track.cover = item.cover as string || '';
            track.album = item.album as string || '';
            track.liked = item.liked as boolean || false;
            const likedUsers = item.likedByUsers as Array<Record<string, Object>> || [];
            for (let j = 0; j < likedUsers.length; j++) {
              const likedUser = new LikeUserData();
              likedUser.userId = likedUsers[j].userId as number | string || '';
              track.likedByUsers.push(likedUser);
            }
            mapped.push(track);
          }
          mapped.sort((a, b) => a.name.localeCompare(b.name));
          this.tracks = mapped;
        }
      } else if (this.activeTab === 'artists') {
        const res = await getArtistList(200, 0, this.mode, undefined);
        const data = res as Record<string, Object>;
        if (data['code'] === 200 && data['data']) {
          const dataObj = data['data'] as Record<string, Object>;
          const list = dataObj['list'] as Array<Record<string, Object>>;
          const mapped: Artist[] = [];
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const artist = new ArtistData();
            artist.id = item.id as number | string || '';
            artist.name = item.name as string || '';
            artist.avatar = item.avatar as string || '';
            artist.cover = item.cover as string || '';
            mapped.push(artist);
          }
          mapped.sort((a, b) => a.name.localeCompare(b.name));
          this.artists = mapped;
        }
      } else if (this.activeTab === 'albums') {
        const albumParams2: Record<string, string> = new Object() as Record<string, string>;
        albumParams2['pageSize'] = '200';
        albumParams2['loadCount'] = '0';
        albumParams2['type'] = this.mode;
        const res = await loadMoreAlbum(albumParams2);
        const data = res as Record<string, Object>;
        if (data['code'] === 200 && data['data']) {
          const dataObj = data['data'] as Record<string, Object>;
          const list = dataObj['list'] as Array<Record<string, Object>>;
          const mapped: Album[] = [];
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const album = new AlbumData();
            album.id = item.id as number | string || '';
            album.name = item.name as string || '';
            album.artist = item.artist as string || '';
            album.cover = item.cover as string || '';
            album.type = item.type as string || '';
            album.progress = item.progress as number || 0;
            album.resumeTrackId = item.resumeTrackId as number | string || '';
            album.resumeProgress = item.resumeProgress as number || 0;
            mapped.push(album);
          }
          mapped.sort((a, b) => a.name.localeCompare(b.name));
          this.albums = mapped;
        }
      } else if (this.activeTab === 'collections' && this.mode === 'AUDIOBOOK' && this.userId.length > 0) {
        const res = await getCollections(this.userId);
        const data = res as Record<string, Object>;
        if (data.code === 200 && data.data) {
          this.collections = data.data as Array<Record<string, Object>>;
        }
      } else if (this.activeTab === 'mvs' && this.mode === 'MUSIC') {
        const res = await getMvList(200, 0) as Record<string, Object>;
        if (res && res['list']) {
          this.mvs = res['list'] as Array<Record<string, Object>>;
        }
      }
    } catch (error) {
      console.error('Failed to load tab data:', error);
    } finally {
      this.loading = false;
    }
  }

  toggleMode() {
    this.mode = this.mode === 'MUSIC' ? 'AUDIOBOOK' : 'MUSIC';
    storage.setItem('playMode', this.mode);
    this.activeTab = 'artists';
    this.loading = true;
    this.loadAllData();
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    this.loading = true;
    this.loadTabData();
  }

  navigateToSearch() {
    // TODO
  }

  navigateToFolder() {
    // TODO
  }

  navigateToArtist(artistId: number | string) {
    // TODO
  }

  navigateToAlbum(albumId: number | string) {
    // TODO
  }

  navigateToCollection(collectionId: string) {
    // TODO
  }

  navigateToMv(mvId: string) {
    // TODO
  }

  playTrack(track: Track) {
    // TODO
  }

  playAllTracks() {
    // TODO: enqueue this.tracks and start playback
  }

  getVisibleTabs(): TabInfo[] {
    const tabs: TabInfo[] = [];
    if (this.mode === 'MUSIC') {
      tabs.push(new TabInfo('songs', t('nav.tracks'), true, false));
    }
    tabs.push(new TabInfo('artists', t('nav.artists'), true, true));
    tabs.push(new TabInfo('albums', t('nav.albums'), true, true));
    if (this.mode === 'MUSIC') {
      tabs.push(new TabInfo('mvs', 'MV', true, false));
    }
    if (this.mode === 'AUDIOBOOK') {
      tabs.push(new TabInfo('collections', t('nav.collections'), false, true));
    }
    return tabs;
  }

  getTabCount(key: string): number {
    return this.tabCounts[key] || 0;
  }

  @Builder
  TabBarBuilder() {
    Row() {
      ForEach(this.getVisibleTabs(), (tab: TabInfo) => {
        Column() {
          Text(tab.label + (this.getTabCount(tab.key) > 0 ? ' ' + this.getTabCount(tab.key) : ''))
            .fontSize(13)
            .fontWeight(this.activeTab === tab.key ? FontWeight.Bold : FontWeight.Normal)
            .fontColor(this.activeTab === tab.key ? '#FFFFFF' : '#2c3e50')
        }
        .padding({ left: 12, right: 12, top: 8, bottom: 8 })
        .backgroundColor(this.activeTab === tab.key ? '#007DFF' : Color.Transparent)
        .borderRadius(16)
        .onClick(() => this.switchTab(tab.key))
      })
    }
    .width('100%')
    .padding({ left: 16, right: 16, bottom: 8 })
    .justifyContent(FlexAlign.Start)
  }

  @Builder
  SongItemBuilder(track: Track) {
    Row() {
      CoverImage({
        path: track.cover,
        imgWidth: 48,
        imgHeight: 48,
        radius: 8,
        fallbackText: track.name,
        fallbackBg: '#52B54B'
      })
        .margin({ right: 12 })

      Column() {
        Text(track.name)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2c3e50')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width(200)

        Text(track.artist + ' · ' + track.album)
          .fontSize(12)
          .fontColor('#95a5a6')
          .margin({ top: 4 })
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width(200)
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)

      Button() {
        AppIcon({ name: 'plus', iconSize: 16, color: '#007DFF' })
      }
      .backgroundColor(Color.Transparent)
      .width(36)
      .height(36)
    }
    .width('100%')
    .padding({ top: 8, bottom: 8, left: 16, right: 16 })
    .onClick(() => this.playTrack(track))
  }

  @Builder
  ArtistGridBuilder() {
    Grid() {
      ForEach(this.artists, (artist: Artist) => {
        GridItem() {
          Column() {
            CoverImage({
              path: artist.avatar || artist.cover,
              imgWidth: 80,
              imgHeight: 80,
              radius: 40,
              fallbackText: artist.name,
              fallbackBg: '#007DFF'
            })

            Text(artist.name)
              .fontSize(13)
              .fontColor('#2c3e50')
              .margin({ top: 8 })
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .textAlign(TextAlign.Center)
              .width(80)
          }
          .margin({ bottom: 16 })
          .onClick(() => this.navigateToArtist(artist.id))
        }
      })
    }
    .columnsTemplate('1fr 1fr 1fr')
    .columnsGap(16)
    .rowsGap(16)
    .padding(16)
  }

  @Builder
  AlbumGridBuilder() {
    Grid() {
      ForEach(this.albums, (album: Album) => {
        GridItem() {
          Column() {
            CoverImage({
              path: album.cover,
              imgWidth: 100,
              imgHeight: 100,
              radius: 10,
              fallbackText: album.name,
              fallbackBg: '#5B8FF9'
            })

            Text(album.name)
              .fontSize(13)
              .fontWeight(FontWeight.Medium)
              .fontColor('#2c3e50')
              .margin({ top: 8, bottom: 4 })
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .width(100)

            Text(album.artist)
              .fontSize(11)
              .fontColor('#95a5a6')
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .width(100)
          }
          .margin({ bottom: 16 })
          .onClick(() => this.navigateToAlbum(album.id))
        }
      })
    }
    .columnsTemplate('1fr 1fr 1fr')
    .columnsGap(16)
    .rowsGap(16)
    .padding(16)
  }

  @Builder
  CollectionGridBuilder() {
    Grid() {
      ForEach(this.collections, (collection: Record<string, Object>) => {
        GridItem() {
          Column() {
            CoverImage({
              path: String(collection.cover || ''),
              imgWidth: 100,
              imgHeight: 100,
              radius: 10,
              fallbackText: String(collection.name || ''),
              fallbackBg: '#FF9500'
            })

            Text(String(collection.name || ''))
              .fontSize(13)
              .fontWeight(FontWeight.Medium)
              .fontColor('#2c3e50')
              .margin({ top: 8, bottom: 4 })
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .width(100)

            Text('共 ' + this.getCollectionCount(collection) + ' 项')
              .fontSize(11)
              .fontColor('#95a5a6')
              .width(100)
          }
          .margin({ bottom: 16 })
          .onClick(() => this.navigateToCollection(String(collection.id)))
        }
      })
    }
    .columnsTemplate('1fr 1fr 1fr')
    .columnsGap(16)
    .rowsGap(16)
    .padding(16)
  }

  getCollectionNameFirstChar(collection: Record<string, Object>): string {
    const name = collection.name as string || '';
    if (name.length > 0) {
      return name.substring(0, 1);
    }
    return '?';
  }

  getCollectionCount(collection: Record<string, Object>): number {
    return 0;
  }

  @Builder
  MvGridBuilder() {
    Grid() {
      ForEach(this.mvs, (mv: Record<string, Object>) => {
        GridItem() {
          Column() {
            CoverImage({
              path: String(mv.cover || ''),
              imgWidth: 100,
              imgHeight: 100,
              radius: 10,
              fallbackText: String(mv.name || ''),
              fallbackBg: '#E74C3C'
            })

            Text(String(mv.name || ''))
              .fontSize(13)
              .fontWeight(FontWeight.Medium)
              .fontColor('#2c3e50')
              .margin({ top: 8, bottom: 4 })
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .width(100)

            Text(String(mv.artist || '未知艺人'))
              .fontSize(11)
              .fontColor('#95a5a6')
              .width(100)
          }
          .margin({ bottom: 16 })
          .onClick(() => this.navigateToMv(String(mv.id)))
        }
      })
    }
    .columnsTemplate('1fr 1fr 1fr')
    .columnsGap(16)
    .rowsGap(16)
    .padding(16)
  }

  getMvNameFirstChar(mv: Record<string, Object>): string {
    const name = String(mv['name'] || '');
    if (name.length > 0) {
      return name.substring(0, 1);
    }
    return '?';
  }

  @Builder
  ContentBuilder() {
    if (this.activeTab === 'songs') {
      List() {
        ForEach(this.tracks, (track: Track) => {
          ListItem() {
            this.SongItemBuilder(track);
          }
        })
      }
      .width('100%')
      .layoutWeight(1)
      .scrollBar(BarState.Off)
      .edgeEffect(EdgeEffect.Spring)
    } else if (this.activeTab === 'artists') {
      Scroll() {
        this.ArtistGridBuilder()
      }
      .width('100%')
      .layoutWeight(1)
      .scrollBar(BarState.Off)
    } else if (this.activeTab === 'albums') {
      Scroll() {
        this.AlbumGridBuilder()
      }
      .width('100%')
      .layoutWeight(1)
      .scrollBar(BarState.Off)
    } else if (this.activeTab === 'collections') {
      Scroll() {
        this.CollectionGridBuilder()
      }
      .width('100%')
      .layoutWeight(1)
      .scrollBar(BarState.Off)
    } else if (this.activeTab === 'mvs') {
      Scroll() {
        this.MvGridBuilder()
      }
      .width('100%')
      .layoutWeight(1)
      .scrollBar(BarState.Off)
    }
  }

  @Builder
  LoadingSkeleton() {
    Column() {
      Row() {
        Row()
          .width(100)
          .height(28)
          .borderRadius(8)
          .backgroundColor('#e8e8e8')

        Row()
          .width(80)
          .height(36)
          .borderRadius(18)
          .backgroundColor('#e8e8e8')
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 20 })
      .justifyContent(FlexAlign.SpaceBetween)

      Row()
        .width('90%')
        .height(36)
        .borderRadius(18)
        .backgroundColor('#e8e8e8')
        .margin({ left: 16, right: 16, top: 16 })

      ForEach([1, 2, 3, 4], (index: number) => {
        Row() {
          Row()
            .width(48)
            .height(48)
            .borderRadius(8)
            .backgroundColor('#e8e8e8')
            .margin({ right: 12 })

          Column() {
            Row()
              .width(120)
              .height(16)
              .borderRadius(8)
              .backgroundColor('#e8e8e8')
              .margin({ bottom: 8 })

            Row()
              .width(80)
              .height(12)
              .borderRadius(6)
              .backgroundColor('#e8e8e8')
          }
          .layoutWeight(1)
        }
        .width('100%')
        .padding({ top: 8, bottom: 8, left: 16, right: 16 })
      })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
  }

  build() {
    if (this.loading) {
      this.LoadingSkeleton();
    } else {
      Column() {
        Row() {
          Text(t('libraryPage.title'))
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor('#2c3e50')

          Row() {
            if (this.mode === 'MUSIC' && this.activeTab === 'songs') {
              Button() {
                AppIcon({ name: 'plus', iconSize: 16, color: '#2c3e50' })
              }
              .width(36)
              .height(36)
              .backgroundColor('#f0f0f0')
              .borderRadius(18)
              .margin({ right: 8 })
              .onClick(() => this.playAllTracks())
            }

            Button() {
              AppIcon({ name: 'folder', iconSize: 18, color: '#2c3e50' })
            }
            .width(36)
            .height(36)
            .backgroundColor('#f0f0f0')
            .borderRadius(18)
            .margin({ right: 8 })
            .onClick(() => this.navigateToFolder())

            Button() {
              AppIcon({ name: 'plus', iconSize: 18, color: '#2c3e50' })
            }
            .width(36)
            .height(36)
            .backgroundColor('#f0f0f0')
            .borderRadius(18)
            .margin({ right: 8 })
            .onClick(() => this.navigateToSearch())

            Button() {
              AppIcon({
                name: this.mode === 'MUSIC' ? 'headphones' : 'headphones',
                iconSize: 18,
                color: '#2c3e50'
              })
            }
            .width(36)
            .height(36)
            .backgroundColor('#f0f0f0')
            .borderRadius(18)
            .onClick(() => this.toggleMode())
          }
        }
        .width('100%')
        .padding({ left: 16, right: 16, top: 16, bottom: 8 })
        .justifyContent(FlexAlign.SpaceBetween)

        this.TabBarBuilder()
        this.ContentBuilder()
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#ffffff')
    }
  }
}
