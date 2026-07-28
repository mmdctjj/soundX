import router from '@ohos.router';
import { AppIcon } from '../components/AppIcon';
import { CoverImage } from '../components/CoverImage';
import { storage } from '../utils/StorageManager';
import { httpClient } from '../utils/HttpClient';
import { t } from 'features_i18n';
import {
  getCurrentUser,
  getPlaylists,
  getFavoriteTracks,
  getFavoriteAlbums,
  getTrackHistory,
  getAlbumHistory,
  Artist,
  Album,
  Track
} from '../utils/ApiService';

class TabInfo {
  key: string = '';
  label: string = '';

  constructor(key: string, label: string) {
    this.key = key;
    this.label = label;
  }
}

@Component
export struct PersonalTab {
  @State mode: string = 'MUSIC';
  @State activeTab: string = 'playlists';
  @State activeSubTab: string = 'album';
  @State loading: boolean = true;
  @State user: Record<string, Object> = {};
  @State userId: string = '';
  @State username: string = '';
  @State playlists: Array<Record<string, Object>> = [];
  @State favorites: Array<Record<string, Object>> = [];
  @State history: Array<Record<string, Object>> = [];

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
        this.user = JSON.parse(savedUser) as Record<string, Object>;
        this.userId = String(this.user['id'] || '');
        this.username = String(this.user['username'] || '');
      }

      const savedMode = await storage.getItem('playMode');
      if (savedMode) {
        this.mode = savedMode;
      }
    } catch (e) {
      console.error('Failed to init personal data:', e);
    }

    this.loadData();
  }

  async loadData() {
    this.loading = true;

    try {
      if (this.userId.length === 0) {
        this.loading = false;
        return;
      }

      if (this.activeTab === 'playlists') {
        const res = await getPlaylists(this.mode, this.userId) as Record<string, Object>;
        if (res['code'] === 200 && res['data']) {
          this.playlists = res['data'] as Array<Record<string, Object>>;
        }
      } else if (this.activeTab === 'favorites') {
        if (this.activeSubTab === 'track') {
          const res = await getFavoriteTracks(this.userId, 0, 100, this.mode) as Record<string, Object>;
          if (res['code'] === 200 && res['data']) {
            const dataObj = res['data'] as Record<string, Object>;
            const list = dataObj['list'] as Array<Record<string, Object>>;
            const mapped: Array<Record<string, Object>> = [];
            for (let i = 0; i < list.length; i++) {
              const item = list[i];
              const track = item['track'] as Record<string, Object> || item;
              mapped.push(track);
            }
            this.favorites = mapped;
          }
        } else {
          const res = await getFavoriteAlbums(this.userId, 0, 100, this.mode) as Record<string, Object>;
          if (res['code'] === 200 && res['data']) {
            const dataObj = res['data'] as Record<string, Object>;
            const list = dataObj['list'] as Array<Record<string, Object>>;
            const mapped: Array<Record<string, Object>> = [];
            for (let i = 0; i < list.length; i++) {
              const item = list[i];
              const album = item['album'] as Record<string, Object> || item;
              mapped.push(album);
            }
            this.favorites = mapped;
          }
        }
      } else if (this.activeTab === 'history') {
        if (this.activeSubTab === 'track') {
          const res = await getTrackHistory(this.userId, 0, 100, this.mode) as Record<string, Object>;
          if (res['code'] === 200 && res['data']) {
            const dataObj = res['data'] as Record<string, Object>;
            const list = dataObj['list'] as Array<Record<string, Object>>;
            const mapped: Array<Record<string, Object>> = [];
            for (let i = 0; i < list.length; i++) {
              const item = list[i];
              const track = item['track'] as Record<string, Object> || item;
              mapped.push(track);
            }
            this.history = mapped;
          }
        } else {
          const res = await getAlbumHistory(this.userId, 0, 100, this.mode) as Record<string, Object>;
          if (res['code'] === 200 && res['data']) {
            const dataObj = res['data'] as Record<string, Object>;
            const list = dataObj['list'] as Array<Record<string, Object>>;
            const mapped: Array<Record<string, Object>> = [];
            for (let i = 0; i < list.length; i++) {
              const item = list[i];
              const album = item['album'] as Record<string, Object> || item;
              mapped.push(album);
            }
            this.history = mapped;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load personal data:', error);
    } finally {
      this.loading = false;
    }
  }

  toggleMode() {
    this.mode = this.mode === 'MUSIC' ? 'AUDIOBOOK' : 'MUSIC';
    storage.setItem('playMode', this.mode);
    this.loading = true;
    this.loadData();
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    this.loading = true;
    this.loadData();
  }

  switchSubTab(tab: string) {
    this.activeSubTab = tab;
    this.loading = true;
    this.loadData();
  }

  navigateToSettings() {
    router.pushUrl({ url: 'pages/SettingsPage' });
  }

  navigateToSourceManage() {
    router.pushUrl({ url: 'pages/SourceManagePage' });
  }

  navigateToMember() {
    // TODO
  }

  navigateToScan() {
    // TODO
  }

  navigateToSearch() {
    // TODO
  }

  navigateToPlaylist(playlistId: string) {
    // TODO
  }

  navigateToAlbum(albumId: string) {
    // TODO
  }

  navigateToArtist(artistId: string) {
    // TODO
  }

  playTrack(track: Record<string, Object>) {
    // TODO
  }

  async logout() {
    try {
      const savedAddress = await storage.getItem('serverAddress');
      if (savedAddress) {
        await storage.removeItem('token_' + savedAddress);
      }
      await storage.removeItem('currentUser');
      await storage.removeItem('serverAddress');
      httpClient.setToken('');
      router.replaceUrl({ url: 'pages/SourceSelectPage' });
    } catch (e) {
      console.error('Logout error:', e);
    }
  }

  getTabs(): TabInfo[] {
    return [
      new TabInfo('playlists', t('nav.playlists')),
      new TabInfo('favorites', t('nav.favorites')),
      new TabInfo('history', t('nav.listened')),
    ];
  }

  getListData(): Array<Record<string, Object>> {
    if (this.activeTab === 'playlists') return this.playlists;
    if (this.activeTab === 'favorites') return this.favorites;
    if (this.activeTab === 'history') return this.history;
    return [];
  }

  @Builder
  TabBarBuilder() {
    Row() {
      ForEach(this.getTabs(), (tab: TabInfo) => {
        Column() {
          Text(tab.label)
            .fontSize(15)
            .fontWeight(this.activeTab === tab.key ? FontWeight.Bold : FontWeight.Normal)
            .fontColor(this.activeTab === tab.key ? '#007DFF' : '#95a5a6')
        }
        .layoutWeight(1)
        .padding({ top: 12, bottom: 12 })
        .border({
          width: { bottom: this.activeTab === tab.key ? 2 : 0 },
          color: '#007DFF'
        })
        .onClick(() => this.switchTab(tab.key))
      })
    }
    .width('100%')
  }

  @Builder
  SubTabBuilder() {
    if (this.activeTab === 'favorites' || this.activeTab === 'history') {
      Row() {
        Button(t('personal.album'))
          .backgroundColor(this.activeSubTab === 'album' ? '#007DFF20' : Color.Transparent)
          .fontColor(this.activeSubTab === 'album' ? '#007DFF' : '#95a5a6')
          .borderRadius(16)
          .height(32)
          .onClick(() => this.switchSubTab('album'))

        if (this.mode !== 'AUDIOBOOK') {
          Button(t('personal.track'))
            .backgroundColor(this.activeSubTab === 'track' ? '#007DFF20' : Color.Transparent)
            .fontColor(this.activeSubTab === 'track' ? '#007DFF' : '#95a5a6')
            .borderRadius(16)
            .height(32)
            .margin({ left: 8 })
            .onClick(() => this.switchSubTab('track'))
        }
      }
      .width('100%')
      .padding({ left: 16, right: 16, bottom: 8 })
      .justifyContent(FlexAlign.Start)
    }
  }

  @Builder
  ListItemBuilder(item: Record<string, Object>) {
    Row() {
      CoverImage({
        path: String(item.cover || ''),
        imgWidth: 50,
        imgHeight: 50,
        radius: 8,
        fallbackText: String(item.name || ''),
        fallbackBg: '#52B54B'
      })
        .margin({ right: 12 })

      Column() {
        Text(String(item.name || ''))
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2c3e50')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width(200)

        Text(String(item.artist || ''))
          .fontSize(12)
          .fontColor('#95a5a6')
          .margin({ top: 4 })
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width(200)
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .padding({ top: 10, bottom: 10, left: 16, right: 16 })
    .onClick(() => {
      if (this.activeTab === 'playlists') {
        this.navigateToPlaylist(String(item.id));
      } else if (this.activeTab === 'favorites' || this.activeTab === 'history') {
        if (this.activeSubTab === 'album') {
          this.navigateToAlbum(String(item.id));
        } else {
          this.playTrack(item);
        }
      }
    })
  }

  @Builder
  LoadingSkeleton() {
    Column() {
      ForEach([1, 2, 3, 4, 5], (index: number) => {
        Row() {
          Row()
            .width(50)
            .height(50)
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
        .padding({ top: 10, bottom: 10, left: 16, right: 16 })
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
          Text(t('navTabs.mine'))
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor('#2c3e50')

          Row() {
            Button() {
              AppIcon({ name: 'folder', iconSize: 22, color: '#2c3e50' })
            }
            .width(36)
            .height(36)
            .backgroundColor('#f0f0f0')
            .borderRadius(18)
            .margin({ right: 8 })
            .onClick(() => this.navigateToSourceManage())

            Button() {
              AppIcon({ name: 'folder', iconSize: 22, color: '#2c3e50' })
            }
            .width(36)
            .height(36)
            .backgroundColor('#f0f0f0')
            .borderRadius(18)
            .onClick(() => this.navigateToSettings())
          }
        }
        .width('100%')
        .padding({ left: 16, right: 16, top: 16, bottom: 8 })
        .justifyContent(FlexAlign.SpaceBetween)

        Row() {
          Stack({ alignContent: Alignment.BottomEnd }) {
            CoverImage({
              path: String(this.user['avatar'] || ''),
              imgWidth: 80,
              imgHeight: 80,
              radius: 40,
              fallbackText: this.username,
              fallbackBg: '#007DFF'
            })

            Stack({ alignContent: Alignment.Center }) {
              AppIcon({ name: 'camera', iconSize: 12, color: '#2c3e50' })
            }
            .width(24)
            .height(24)
            .borderRadius(12)
            .backgroundColor('#FFFFFF')
          }
          .width(80)
          .height(80)

          Column() {
            Row() {
              Text(this.username || t('common.notLoggedIn'))
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor('#2c3e50')

              if (this.userId.length > 0) {
                AppIcon({ name: 'crown', iconSize: 20, color: '#FFD700' })
                  .margin({ left: 6 })
              }
            }
            .alignItems(VerticalAlign.Center)

            Row() {
              Button(this.mode === 'MUSIC' ? t('nav.library') : t('nav.personal'))
                .backgroundColor('#f0f0f0')
                .fontColor('#2c3e50')
                .borderRadius(16)
                .height(32)
                .margin({ right: 8 })
                .onClick(() => this.toggleMode())

              Button('退出')
                .backgroundColor('#ff4d4f20')
                .fontColor('#ff4d4f')
                .borderRadius(16)
                .height(32)
                .onClick(() => this.logout())
            }
            .margin({ top: 12 })
          }
          .layoutWeight(1)
          .margin({ left: 16 })
          .alignItems(HorizontalAlign.Start)
        }
        .width('100%')
        .padding({ left: 16, right: 16, top: 16, bottom: 16 })

        this.TabBarBuilder()
        this.SubTabBuilder()

        List() {
          ForEach(this.getListData(), (item: Record<string, Object>) => {
            ListItem() {
              this.ListItemBuilder(item);
            }
          })
        }
        .width('100%')
        .layoutWeight(1)
        .scrollBar(BarState.Off)
        .edgeEffect(EdgeEffect.Spring)

        if (this.getListData().length === 0) {
          Column() {
            Text(t('common.noData'))
              .fontSize(14)
              .fontColor('#95a5a6')
              .margin({ top: 40 })
          }
          .width('100%')
          .layoutWeight(1)
        }
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#ffffff')
    }
  }
}
