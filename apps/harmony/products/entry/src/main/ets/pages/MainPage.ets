import router from '@ohos.router';
import { kvStore } from 'features_storage';
import { t } from 'features_i18n';
import { Logger } from 'audiodock_common';
import {
  artistApi, albumApi, trackApi, userDataApi,
} from 'features_network';
import type { ArtistDto, AlbumDto, TrackDto } from 'features_network';
import { MiniPlayer } from '../components/MiniPlayer';
import { AppIcon, AppIconName } from '../components/AppIcon';
import { CoverImage } from '../components/CoverImage';
import { LibraryTab } from './LibraryPage';
import { PersonalTab } from './PersonalPage';
import { authStore } from '../context/AuthStore';
import { likesHistory } from '../services/LikesHistoryService';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { playerStore } from '../context/PlayerStore';
import type { Track } from '../context/PlayerStore';
import { buildTheme, withAlpha } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';

const PAGE_SIZE: number = 8;

class Section {
  id: string = '';
  title: string = '';
  type: string = '';
  artists: ArtistDto[] = [];
  albums: AlbumDto[] = [];
  tracks: TrackDto[] = [];
  // 局部刷新时递增，配合 ForEach key 强制重建对应版块，避免只改数据不重渲染。
  version: number = 0;

  constructor(id: string, title: string, type: string) {
    this.id = id;
    this.title = title;
    this.type = type;
  }
}

@Component
export struct HomeTab {
  @State sections: Section[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State error: string = '';
  @State mode: string = 'MUSIC';
  @State isRadioMode: boolean = false;
  @State likedIds: string[] = [];
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @StorageProp('appLang') @Watch('onLangChange') appLang: string = 'zh-CN';
  // 调整顺序页保存时会写入该值，触发首页按最新 section_order 重排。
  @StorageLink('sectionOrderVersion') @Watch('onSectionOrderChange') sectionOrderVersion: number = 0;
  @State theme: Theme = buildTheme('light');
  private userId: string = '';

  aboutToAppear() {
    this.theme = buildTheme(this.themeMode);
    this.initData();
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  onLangChange(): void {
    // 语言切换后重建 section 标题（title 是 loadData 时通过 t() 计算的）
    this.loadData();
  }

  async initData(): Promise<void> {
    // baseURL / token 已由 EntryAbility + Index(authStore.loadFromStorage) 装配好，
    // 这里只取当前用户与播放模式。
    this.userId = authStore.state_.user?.id ?? '';
    try {
      const savedMode = await kvStore.get('playMode');
      if (savedMode) this.mode = savedMode;
    } catch (e) {
      Logger.w('HomeTab', `read playMode failed: ${String(e)}`);
    }
    this.loading = true;
    await this.loadData();
    this.loading = false;
  }

  async loadData(): Promise<void> {
    this.error = '';
    try {
      const isMusic = this.mode === 'MUSIC';
      const built: Section[] = [];

      const artists = await artistApi.latest({ type: this.mode, random: true, pageSize: PAGE_SIZE });
      if (artists.length > 0) {
        const s = new Section('artists', t('homePage.latestArtists'), 'artist');
        s.artists = artists;
        built.push(s);
      }

      const recent = await albumApi.latest({ type: this.mode, random: true, pageSize: PAGE_SIZE });
      if (recent.length > 0) {
        const s = new Section('recent', t('homePage.latestAlbums'), 'album');
        s.albums = recent;
        built.push(s);
      }

      const recommended = await albumApi.recommend({ type: this.mode, pageSize: PAGE_SIZE });
      if (recommended.length > 0) {
        const s = new Section('recommended', t('homePage.recommendedAlbums'), 'album');
        s.albums = recommended;
        built.push(s);
      }

      if (isMusic) {
        const tracks = await trackApi.latest({ type: 'MUSIC', random: true, pageSize: PAGE_SIZE });
        if (tracks.length > 0) {
          const s = new Section('tracks', t('homePage.latestTracks'), 'track');
          s.tracks = tracks;
          built.push(s);
        }
        await this.refreshLikedIds(tracks);
      } else if (this.userId.length > 0) {
        const history = await userDataApi.albumHistory({ pageSize: PAGE_SIZE, loadCount: 0, type: 'AUDIOBOOK' });
        const albums: AlbumDto[] = [];
        for (const item of history.list) {
          if (item.album) albums.push(item.album);
        }
        if (albums.length > 0) {
          const s = new Section('history', t('homePage.continueListening'), 'album');
          s.albums = albums;
          built.push(s);
        }
      }

      await this.sortWithSavedOrder(built);
      this.sections = built;
    } catch (e) {
      // 之前这里只 console.error，导致首页静默变成一片空白，看不出是网络挂了。
      this.error = e instanceof Error ? e.message : String(e);
      Logger.e('HomeTab', `load failed: ${this.error}`);
    }
  }

  // 按用户在「调整顺序」页保存的 section_order 对版块排序（对齐 mobile AsyncStorage 逻辑）。
  private async sortWithSavedOrder(list: Section[]): Promise<void> {
    try {
      const order = await kvStore.getJSON<string[]>('section_order');
      if (order) {
        list.sort((a: Section, b: Section): number => {
          const ia = order.indexOf(a.id);
          const ib = order.indexOf(b.id);
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        });
      }
    } catch (e) {
      Logger.w('HomeTab', `load section order failed: ${String(e)}`);
    }
  }

  onSectionOrderChange(): void {
    this.reapplyOrder();
  }

  private async reapplyOrder(): Promise<void> {
    if (this.sections.length === 0) return;
    const list = this.sections.slice();
    await this.sortWithSavedOrder(list);
    this.sections = list;
  }

  // 下拉刷新：整页重载（对齐 mobile RefreshControl + onRefresh）。
  async onPullRefresh(): Promise<void> {
    try {
      const savedMode = await kvStore.get('playMode');
      if (savedMode) this.mode = savedMode;
    } catch (e) {
      Logger.w('HomeTab', `read playMode failed: ${String(e)}`);
    }
    await this.loadData();
    this.refreshing = false;
  }

  // 版块刷新按钮：只局部重载对应版块，不触发整页骨架屏（对齐 mobile refreshSection）。
  async refreshSection(sectionId: string): Promise<void> {
    try {
      if (sectionId === 'artists') {
        const artists = await artistApi.latest({ type: this.mode, random: true, pageSize: PAGE_SIZE });
        if (artists.length > 0) {
          this.replaceSectionData('artists', (s: Section): void => { s.artists = artists; });
        }
      } else if (sectionId === 'recent') {
        const recent = await albumApi.latest({ type: this.mode, random: true, pageSize: PAGE_SIZE });
        if (recent.length > 0) {
          this.replaceSectionData('recent', (s: Section): void => { s.albums = recent; });
        }
      } else if (sectionId === 'recommended') {
        const recommended = await albumApi.recommend({ type: this.mode, pageSize: PAGE_SIZE });
        if (recommended.length > 0) {
          this.replaceSectionData('recommended', (s: Section): void => { s.albums = recommended; });
        }
      } else if (sectionId === 'tracks') {
        const tracks = await trackApi.latest({ type: 'MUSIC', random: true, pageSize: PAGE_SIZE });
        if (tracks.length > 0) {
          this.replaceSectionData('tracks', (s: Section): void => { s.tracks = tracks; });
          await this.refreshLikedIds(tracks);
        }
      } else if (sectionId === 'history') {
        const history = await userDataApi.albumHistory({ pageSize: PAGE_SIZE, loadCount: 0, type: 'AUDIOBOOK' });
        const albums: AlbumDto[] = [];
        for (const item of history.list) {
          if (item.album) albums.push(item.album);
        }
        if (albums.length > 0) {
          this.replaceSectionData('history', (s: Section): void => { s.albums = albums; });
        }
      }
    } catch (e) {
      Logger.w('HomeTab', `refreshSection ${sectionId} failed: ${String(e)}`);
    }
  }

  private replaceSectionData(id: string, apply: (s: Section) => void): void {
    const next: Section[] = [];
    for (const s of this.sections) {
      if (s.id === id) {
        const copy = new Section(s.id, s.title, s.type);
        copy.artists = s.artists;
        copy.albums = s.albums;
        copy.tracks = s.tracks;
        copy.version = s.version + 1;
        apply(copy);
        next.push(copy);
      } else {
        next.push(s);
      }
    }
    this.sections = next;
  }

  private async refreshLikedIds(tracks: TrackDto[]): Promise<void> {
    if (this.userId.length === 0) return;
    const ids: string[] = [];
    for (const tr of tracks) {
      try {
        if (await likesHistory.isTrackLiked(String(tr.id))) ids.push(String(tr.id));
      } catch (e) {
        Logger.w('HomeTab', `isTrackLiked failed: ${String(e)}`);
      }
    }
    this.likedIds = ids;
  }

  isLiked(id: string): boolean {
    return this.likedIds.includes(id);
  }

  async toggleLike(trackId: string): Promise<void> {
    if (this.userId.length === 0) return;
    const liked = this.isLiked(trackId);
    try {
      if (liked) await likesHistory.unlikeTrack(trackId);
      else await likesHistory.likeTrack(trackId);
      const next: string[] = [];
      for (const id of this.likedIds) {
        if (id !== trackId) next.push(id);
      }
      if (!liked) next.push(trackId);
      this.likedIds = next;
    } catch (e) {
      Logger.w('HomeTab', `toggleLike failed: ${String(e)}`);
    }
  }

  async toggleMode(): Promise<void> {
    this.mode = this.mode === 'MUSIC' ? 'AUDIOBOOK' : 'MUSIC';
    await kvStore.set('playMode', this.mode);
    await this.loadData();
  }

  toggleRadioMode(): void {
    this.isRadioMode = !this.isRadioMode;
  }

  navigateToSearch(): void {
    router.pushUrl({ url: 'pages/SearchPage' });
  }

  navigateToSectionOrder(): void {
    router.pushUrl({ url: 'pages/SectionOrderPage' });
  }

  navigateToArtist(id: string): void {
    router.pushUrl({ url: 'pages/ArtistDetailPage', params: { id: id } });
  }

  navigateToAlbum(id: string): void {
    router.pushUrl({ url: 'pages/AlbumDetailPage', params: { id: id } });
  }

  async playTrack(track: TrackDto, queue: TrackDto[]): Promise<void> {
    try {
      const list: Track[] = [];
      for (const item of queue) list.push(await resolveTrackToPlayer(item, false));
      let idx = 0;
      for (let i = 0; i < queue.length; i++) {
        if (queue[i].id === track.id) { idx = i; break; }
      }
      await playerStore.playTrackList(list, idx);
      router.pushUrl({ url: 'pages/PlayerPage' });
    } catch (e) {
      Logger.w('HomeTab', `playTrack failed: ${String(e)}`);
    }
  }

  @Builder
  ArtistCard(artist: ArtistDto) {
    Column() {
      CoverImage({
        path: artist.avatar,
        imgWidth: 80, imgHeight: 80, radius: 40,
        fallbackText: artist.name,
      })
      Text(artist.name)
        .fontSize(13).fontColor(this.theme.colors.text).margin({ top: 8 })
        .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
        .textAlign(TextAlign.Center).width(80)
    }
    .margin({ right: 16 })
    .onClick(() => this.navigateToArtist(String(artist.id)))
  }

  @Builder
  AlbumCard(album: AlbumDto, showProgress: boolean) {
    Column() {
      Stack({ alignContent: Alignment.Bottom }) {
        CoverImage({
          path: album.cover,
          imgWidth: 120, imgHeight: 120, radius: 10,
          fallbackText: album.name,
        })
        if (showProgress && album.progress !== undefined && album.progress > 0) {
          Stack() {
            Row().width('100%').height(3)
              .backgroundColor('rgba(255,255,255,0.3)').borderRadius(1.5)
            Row().width(album.progress + '%').height(3)
              .backgroundColor(this.theme.colors.primary).borderRadius(1.5)
          }
          .width(120).margin({ top: -8, bottom: 8 })
        }
      }
      .width(120).height(120)

      Text(album.name)
        .fontSize(14).fontWeight(FontWeight.Medium).fontColor(this.theme.colors.text)
        .margin({ top: showProgress ? 0 : 8, bottom: 4 })
        .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).width(120)

      Text(album.artist ?? '')
        .fontSize(12).fontColor(this.theme.colors.textSecondary)
        .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).width(120)
    }
    .margin({ right: 16 })
    .onClick(() => this.navigateToAlbum(String(album.id)))
  }

  @Builder
  TrackCard(track: TrackDto, queue: TrackDto[]) {
    Row() {
      CoverImage({
        path: track.cover,
        imgWidth: 50, imgHeight: 50, radius: 4,
        fallbackText: track.name,
      })
      Column() {
        Text(track.name)
          .fontSize(14).fontWeight(FontWeight.Medium).fontColor(this.theme.colors.text)
          .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).width(100)
        Text(track.artist ?? '')
          .fontSize(12).fontColor(this.theme.colors.textSecondary).margin({ top: 4 })
          .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).width(100)
      }
      .layoutWeight(1).margin({ left: 12 }).alignItems(HorizontalAlign.Start)

      Button() {
        AppIcon({
          name: 'heart', iconSize: 16,
          color: this.isLiked(String(track.id)) ? this.theme.colors.primary : this.theme.colors.textSecondary,
        })
      }
      .backgroundColor(Color.Transparent).width(32).height(32)
      .onClick(() => this.toggleLike(String(track.id)))
    }
    .width(260).padding(10)
    .backgroundColor(this.theme.colors.surface).borderRadius(8)
    .margin({ right: 12, bottom: 10 })
    .onClick(() => this.playTrack(track, queue))
  }

  @Builder
  SectionHeader(title: string, sectionId: string) {
    Row() {
      Text(title)
        .fontSize(18).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.text).layoutWeight(1)
      Button() {
        AppIcon({ name: 'arrow-clockwise', iconSize: 16, color: this.theme.colors.text })
      }
      .backgroundColor(Color.Transparent).width(32).height(32)
      .onClick(() => this.refreshSection(sectionId))
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 20, bottom: 12 })
    .justifyContent(FlexAlign.SpaceBetween)
  }

  build() {
    if (this.loading) {
      this.LoadingSkeleton();
    } else {
      Column() {
        Row() {
          Text(t('homePage.title'))
            .fontSize(24).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.text)
          Row() {
            if (this.mode === 'MUSIC') {
              Button() {
                AppIcon({ name: 'radio', iconSize: 18, color: this.isRadioMode ? this.theme.colors.primary : this.theme.colors.text })
              }
              .width(36).height(36)
              .backgroundColor(this.isRadioMode ? withAlpha(this.theme.colors.primary, '20') : this.theme.colors.surface)
              .borderRadius(18).margin({ right: 8 })
              .borderWidth(this.isRadioMode ? 1 : 0).borderColor(withAlpha(this.theme.colors.primary, '40'))
              .onClick(() => this.toggleRadioMode())
            }
            Button() {
              AppIcon({ name: 'headphones', iconSize: 18, color: this.theme.colors.text })
            }
            .width(36).height(36).backgroundColor(this.theme.colors.surface).borderRadius(18)
            .onClick(() => this.toggleMode())
          }
        }
        .width('100%')
        .padding({ left: 16, right: 16, top: 16, bottom: 8 })
        .justifyContent(FlexAlign.SpaceBetween)

        Row() {
          Text(t('homePage.searchPlaceholder')).fontSize(14).fontColor(this.theme.colors.textSecondary)
        }
        .width('100%').height(44)
        .padding({ left: 16, right: 16 }).margin({ left: 16, right: 16 })
        .backgroundColor(this.theme.colors.surface).borderRadius(10)
        .justifyContent(FlexAlign.Start).alignItems(VerticalAlign.Center)
        .onClick(() => this.navigateToSearch())

        if (this.error.length > 0) {
          this.ErrorState();
        } else {
          Refresh({ refreshing: $$this.refreshing }) {
            List() {
              ForEach(this.sections, (section: Section) => {
                ListItem() {
                  Column() {
                    this.SectionHeader(section.title, section.id)
                    Scroll() {
                      Row() {
                        if (section.type === 'artist') {
                          ForEach(section.artists, (item: ArtistDto) => {
                            this.ArtistCard(item);
                          }, (item: ArtistDto) => String(item.id))
                        } else if (section.type === 'album') {
                          ForEach(section.albums, (item: AlbumDto) => {
                            this.AlbumCard(item, section.id === 'history');
                          }, (item: AlbumDto) => String(item.id))
                        } else {
                          ForEach(this.chunkTracks(section.tracks), (chunk: TrackDto[], ci: number) => {
                            Column() {
                              ForEach(chunk, (track: TrackDto) => {
                                this.TrackCard(track, section.tracks);
                              }, (track: TrackDto) => String(track.id))
                            }
                          }, (chunk: TrackDto[], ci: number) => `chunk-${ci}`)
                        }
                      }
                      .padding({ left: 16, right: 16 })
                    }
                    .scrollBar(BarState.Off)
                    .scrollable(ScrollDirection.Horizontal)
                  }
                  .width('100%').alignItems(HorizontalAlign.Start)
                }
              }, (section: Section) => `${section.id}-${section.version}`)

              ListItem() {
                Row() {
                  AppIcon({ name: 'list', iconSize: 16, color: this.theme.colors.primary }).margin({ right: 8 })
                  Text(t('homePage.adjustOrder')).fontSize(14).fontColor(this.theme.colors.primary)
                }
                .width('100%').padding(20).justifyContent(FlexAlign.Center)
                .onClick(() => this.navigateToSectionOrder())
              }
            }
            .width('100%').height('100%')
            .scrollBar(BarState.Off).edgeEffect(EdgeEffect.Spring)
          }
          .width('100%').layoutWeight(1)
          .onRefreshing((): void => { this.onPullRefresh(); })
        }
      }
      .width('100%').height('100%').backgroundColor(this.theme.colors.background)
    }
  }

  @Builder
  ErrorState() {
    Column({ space: 12 }) {
      Text(t('common.error')).fontSize(16).fontColor(this.theme.colors.text)
      Text(this.error).fontSize(12).fontColor(this.theme.colors.textSecondary)
        .maxLines(3).textAlign(TextAlign.Center)
      Button(t('common.retry'))
        .backgroundColor(this.theme.colors.primary).fontColor(this.theme.colors.onPrimary).borderRadius(18)
        .onClick(() => this.loadData())
    }
    .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center).padding(24)
  }

  chunkTracks(tracks: TrackDto[]): TrackDto[][] {
    const result: TrackDto[][] = [];
    for (let i = 0; i < tracks.length; i += 2) {
      const chunk: TrackDto[] = [];
      chunk.push(tracks[i]);
      if (i + 1 < tracks.length) chunk.push(tracks[i + 1]);
      result.push(chunk);
    }
    return result;
  }

  @Builder
  LoadingSkeleton() {
    Column() {
      Row() {
        Row().width(100).height(28).borderRadius(8).backgroundColor(this.theme.colors.border)
        Row().width(80).height(36).borderRadius(18).backgroundColor(this.theme.colors.border)
      }
      .width('100%').padding({ left: 16, right: 16, top: 20 })
      .justifyContent(FlexAlign.SpaceBetween)

      Row().width('90%').height(44).borderRadius(10)
        .backgroundColor(this.theme.colors.border).margin({ left: 16, right: 16, top: 16 })

      // 版块 1：艺术家（圆形头像）
      Column() {
        Row().width(120).height(24).borderRadius(8)
          .backgroundColor(this.theme.colors.border).margin({ left: 16, bottom: 12 })
        Row() {
          ForEach([1, 2, 3, 4], (i: number) => {
            Column() {
              Row().width(80).height(80).borderRadius(40)
                .backgroundColor(this.theme.colors.border).margin({ bottom: 8 })
              Row().width(60).height(14).borderRadius(4).backgroundColor(this.theme.colors.border)
            }
            .margin({ right: 16 })
          }, (i: number) => `sk-a-${i}`)
        }
        .padding({ left: 16 })
      }
      .margin({ top: 16 }).alignItems(HorizontalAlign.Start)

      // 版块 2：单曲（横向卡片）
      Column() {
        Row().width(120).height(24).borderRadius(8)
          .backgroundColor(this.theme.colors.border).margin({ left: 16, bottom: 12 })
        Row() {
          ForEach([1, 2], (i: number) => {
            Row() {
              Row().width(50).height(50).borderRadius(4)
                .backgroundColor(this.theme.colors.border).margin({ right: 12 })
              Column() {
                Row().width(100).height(14).borderRadius(4)
                  .backgroundColor(this.theme.colors.border).margin({ bottom: 8 })
                Row().width(70).height(12).borderRadius(4).backgroundColor(this.theme.colors.border)
              }
              .alignItems(HorizontalAlign.Start)
            }
            .width(260).padding(10).borderRadius(8)
            .backgroundColor(this.theme.colors.surface).margin({ right: 12 })
          }, (i: number) => `sk-t-${i}`)
        }
        .padding({ left: 16 })
      }
      .margin({ top: 16 }).alignItems(HorizontalAlign.Start)

      // 版块 3：专辑（方形封面）
      Column() {
        Row().width(120).height(24).borderRadius(8)
          .backgroundColor(this.theme.colors.border).margin({ left: 16, bottom: 12 })
        Row() {
          ForEach([1, 2, 3, 4], (i: number) => {
            Column() {
              Row().width(120).height(120).borderRadius(10)
                .backgroundColor(this.theme.colors.border).margin({ bottom: 8 })
              Row().width(100).height(14).borderRadius(4)
                .backgroundColor(this.theme.colors.border).margin({ bottom: 4 })
              Row().width(70).height(12).borderRadius(4).backgroundColor(this.theme.colors.border)
            }
            .margin({ right: 16 })
          }, (i: number) => `sk-al-${i}`)
        }
        .padding({ left: 16 })
      }
      .margin({ top: 16 }).alignItems(HorizontalAlign.Start)
    }
    .width('100%').height('100%').backgroundColor(this.theme.colors.background)
  }
}

@Entry
@Component
struct MainPage {
  @State currentIndex: number = 0;
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @StorageProp('appLang') appLang: string = 'zh-CN';
  @State theme: Theme = buildTheme('light');

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  @Builder
  TabBuilder(title: string, index: number, icon: AppIconName) {
    Column() {
      AppIcon({ name: icon, iconSize: 24, color: this.currentIndex === index ? this.theme.colors.tabBarActive : this.theme.colors.tabBarInactive })
        .margin({ bottom: 4 })
      Text(title)
        .fontSize(12)
        .fontColor(this.currentIndex === index ? this.theme.colors.tabBarActive : this.theme.colors.tabBarInactive)
        .fontWeight(this.currentIndex === index ? FontWeight.Bold : FontWeight.Normal)
    }
    .width('100%').height(56).justifyContent(FlexAlign.Center)
  }

  build() {
    Stack({ alignContent: Alignment.Bottom }) {
      Tabs({ barPosition: BarPosition.End }) {
        TabContent() {
          HomeTab()
        }
        .tabBar(this.TabBuilder(t('navTabs.recommend'), 0, 'home'))

        TabContent() {
          LibraryTab()
        }
        .tabBar(this.TabBuilder(t('navTabs.soundcang'), 1, 'headphones'))

        TabContent() {
          PersonalTab()
        }
        .tabBar(this.TabBuilder(t('navTabs.mine'), 2, 'person'))
      }
      .width('100%').height('100%')
      .barWidth('100%').barHeight(56)
      .animationDuration(300)
      .onChange((index: number) => {
        this.currentIndex = index;
      })

      MiniPlayer().margin({ bottom: 56 })
    }
    .width('100%').height('100%').backgroundColor(this.theme.colors.background)
  }
}
