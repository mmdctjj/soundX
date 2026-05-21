import router from '@ohos.router';
import { storage } from '../utils/StorageManager';
import { httpClient } from '../utils/HttpClient';
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

@Entry
@Component
struct PersonalPage {
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
    // TODO
  }

  navigateToSourceManage() {
    // TODO
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
      new TabInfo('playlists', '播放列表'),
      new TabInfo('favorites', '收藏'),
      new TabInfo('history', '历史'),
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
            .fontSize(14)
            .fontWeight(this.activeTab === tab.key ? FontWeight.Bold : FontWeight.Normal)
            .fontColor(this.activeTab === tab.key ? '#007DFF' : '#95a5a6')
        }
        .padding({ left: 16, right: 16, top: 12, bottom: 12 })
        .borderWidth(this.activeTab === tab.key ? 2 : 0)
        .borderColor('#007DFF')
        .borderRadius(20)
        .onClick(() => this.switchTab(tab.key))
      })
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 8, bottom: 8 })
    .justifyContent(FlexAlign.SpaceAround)
  }

  @Builder
  SubTabBuilder() {
    if (this.activeTab === 'favorites' || this.activeTab === 'history') {
      Row() {
        Button('专辑')
          .backgroundColor(this.activeSubTab === 'album' ? '#007DFF20' : Color.Transparent)
          .fontColor(this.activeSubTab === 'album' ? '#007DFF' : '#95a5a6')
          .borderRadius(16)
          .height(32)
          .onClick(() => this.switchSubTab('album'))

        if (this.mode !== 'AUDIOBOOK') {
          Button('单曲')
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
      Column() {
        Text(String(item.name || '').substring(0, 1))
          .fontSize(20)
          .fontColor('#FFFFFF')
          .fontWeight(FontWeight.Bold)
      }
      .width(50)
      .height(50)
      .borderRadius(8)
      .backgroundColor('#52B54B')
      .justifyContent(FlexAlign.Center)
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
          Text('我的')
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor('#2c3e50')

          Row() {
            Button() {
              Text('🔍')
                .fontSize(18)
            }
            .width(36)
            .height(36)
            .backgroundColor('#f0f0f0')
            .borderRadius(18)
            .margin({ right: 8 })
            .onClick(() => this.navigateToSearch())

            Button() {
              Text('⚙️')
                .fontSize(18)
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

        Column() {
          Column() {
            Text(this.username.substring(0, 1))
              .fontSize(36)
              .fontColor('#FFFFFF')
              .fontWeight(FontWeight.Bold)
          }
          .width(80)
          .height(80)
          .borderRadius(40)
          .backgroundColor('#007DFF')
          .justifyContent(FlexAlign.Center)

          Text(this.username || '未登录')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor('#2c3e50')
            .margin({ top: 12 })

          Row() {
            Button(this.mode === 'MUSIC' ? '🎵 音乐' : '🎧 有声书')
              .backgroundColor('#f0f0f0')
              .fontColor('#2c3e50')
              .borderRadius(16)
              .height(32)
              .margin({ right: 8 })
              .onClick(() => this.toggleMode())

            Button('📤 退出')
              .backgroundColor('#ff4d4f20')
              .fontColor('#ff4d4f')
              .borderRadius(16)
              .height(32)
              .onClick(() => this.logout())
          }
          .margin({ top: 12 })
        }
        .width('100%')
        .padding(20)
        .alignItems(HorizontalAlign.Center)

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
            Text('暂无数据')
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
