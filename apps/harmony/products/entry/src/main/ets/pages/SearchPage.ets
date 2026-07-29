import router from '@ohos.router';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { trackApi, albumApi, artistApi, httpClient } from 'features_network';
import type { TrackDto, AlbumDto, ArtistDto } from 'features_network';
import { rdbStore } from 'features_storage';
import { Logger } from 'audiodock_common';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { playerStore } from '../context/PlayerStore';
import { likesHistory } from '../services/LikesHistoryService';
import { CoverImage } from '../components/CoverImage';
import { AppIcon } from '../components/AppIcon';
import { MiniPlayer } from '../components/MiniPlayer';

const DEBOUNCE_MS = 500;
const RESULT_LIMIT = 30;

interface HotItem {
  keyword: string;
  count: number;
}

interface ResultSection {
  title: string;
  type: string; // 'artist' | 'album' | 'track'
}

@Entry
@Component
struct SearchPage {
  @State keyword: string = '';
  @State tracks: TrackDto[] = [];
  @State albums: AlbumDto[] = [];
  @State artists: ArtistDto[] = [];
  @State searching: boolean = false;
  @State history: string[] = [];
  @State hotSearches: HotItem[] = [];
  @State likedTrackIds: string[] = [];
  @State likedAlbumIds: string[] = [];
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @StorageProp('appLang') appLang: string = 'zh-CN';
  @State theme: Theme = buildTheme('light');
  private debounceTimer: number | null = null;
  private reqSeq: number = 0;

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    this.loadMeta();
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  aboutToDisappear(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
  }

  private async loadMeta(): Promise<void> {
    this.history = await rdbStore.listSearchKeywords(20);
    try {
      const resp = await httpClient.get<HotItem[]>('/search-record/hot');
      this.hotSearches = resp ?? [];
    } catch (e) {
      Logger.w('Search', `hot searches failed: ${String(e)}`);
    }
  }

  private scheduleSearch(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout((): void => { this.runSearch(this.keyword); }, DEBOUNCE_MS);
  }

  private async runSearch(kw: string): Promise<void> {
    const trimmed = kw.trim();
    if (trimmed.length === 0) {
      this.tracks = []; this.albums = []; this.artists = [];
      return;
    }
    const seq = ++this.reqSeq;
    this.searching = true;
    await rdbStore.upsertSearchKeyword(trimmed);
    const results = await Promise.allSettled([
      trackApi.search({ keyword: trimmed, limit: RESULT_LIMIT }),
      albumApi.search(trimmed, RESULT_LIMIT),
      artistApi.search(trimmed, RESULT_LIMIT),
    ]);
    if (seq !== this.reqSeq) return;
    this.tracks = results[0].status === 'fulfilled' ? results[0].value : [];
    this.albums = results[1].status === 'fulfilled' ? results[1].value : [];
    this.artists = results[2].status === 'fulfilled' ? results[2].value : [];
    this.searching = false;
    this.refreshLikes();
    this.loadMeta();
  }

  private async refreshLikes(): Promise<void> {
    const tIds: string[] = [];
    for (const tr of this.tracks) {
      try { if (await likesHistory.isTrackLiked(String(tr.id))) tIds.push(String(tr.id)); } catch (_e) { /* skip */ }
    }
    this.likedTrackIds = tIds;
    const aIds: string[] = [];
    for (const a of this.albums) {
      try { if (await likesHistory.isAlbumLiked(String(a.id))) aIds.push(String(a.id)); } catch (_e) { /* skip */ }
    }
    this.likedAlbumIds = aIds;
  }

  private async toggleTrackLike(id: string): Promise<void> {
    const liked = this.likedTrackIds.includes(id);
    try {
      if (liked) await likesHistory.unlikeTrack(id);
      else await likesHistory.likeTrack(id);
      const next: string[] = [];
      for (const x of this.likedTrackIds) { if (x !== id) next.push(x); }
      if (!liked) next.push(id);
      this.likedTrackIds = next;
    } catch (e) { Logger.w('Search', `toggleTrackLike: ${String(e)}`); }
  }

  private async toggleAlbumLike(id: string): Promise<void> {
    const liked = this.likedAlbumIds.includes(id);
    try {
      if (liked) await likesHistory.unlikeAlbum(id);
      else await likesHistory.likeAlbum(id);
      const next: string[] = [];
      for (const x of this.likedAlbumIds) { if (x !== id) next.push(x); }
      if (!liked) next.push(id);
      this.likedAlbumIds = next;
    } catch (e) { Logger.w('Search', `toggleAlbumLike: ${String(e)}`); }
  }

  private hasResults(): boolean {
    return this.artists.length > 0 || this.albums.length > 0 || this.tracks.length > 0;
  }

  build() {
    Column() {
      // ─── Header: back + search input ───
      Row({ space: 10 }) {
        Button() { Text('‹').fontSize(28).fontColor(this.theme.colors.text) }
          .width(36).height(36).backgroundColor(Color.Transparent)
          .onClick((): void => router.back())

        Row() {
          Text('⌕').fontSize(20).fontColor(this.theme.colors.textSecondary)
            .margin({ right: 8 })
          TextInput({ placeholder: t('search.placeholder'), text: this.keyword })
            .layoutWeight(1).height('100%')
            .backgroundColor(Color.Transparent)
            .fontSize(16).fontColor(this.theme.colors.text)
            .placeholderColor(this.theme.colors.textSecondary)
            .onChange((v: string) => { this.keyword = v; this.scheduleSearch(); })
          if (this.keyword.length > 0) {
            Text('✕').fontSize(16).fontColor(this.theme.colors.textSecondary)
              .onClick(() => { this.keyword = ''; this.tracks = []; this.albums = []; this.artists = []; })
          }
        }
        .layoutWeight(1).height(40).borderRadius(20)
        .padding({ left: 15, right: 15 })
        .backgroundColor(this.theme.colors.surface)
      }
      .width('100%').padding({ left: 15, right: 15, top: 10, bottom: 10 })

      // ─── Body ───
      if (this.searching) {
        Column() { LoadingProgress().width(40).height(40).color(this.theme.colors.primary) }
          .width('100%').layoutWeight(1).justifyContent(FlexAlign.Start).padding({ top: 100 })
      } else if (this.keyword.trim().length === 0) {
        this.suggestView()
      } else if (!this.hasResults()) {
        Column() {
          Text(t('search.empty')).fontSize(14).fontColor(this.theme.colors.textSecondary)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Start).padding({ top: 100 })
      } else {
        this.resultsView()
      }

      MiniPlayer()
    }
    .width('100%').height('100%').backgroundColor(this.theme.colors.background)
  }

  // ─── 搜索建议：历史 + 热搜 ───
  @Builder
  suggestView() {
    Scroll() {
      Column() {
        if (this.history.length > 0) {
          Row() {
            Text(t('search.searchHistory')).fontSize(16).fontWeight(FontWeight.Bold)
              .fontColor(this.theme.colors.text).layoutWeight(1)
            Text(t('search.history_clear')).fontSize(13).fontColor(this.theme.colors.textSecondary)
              .onClick(async () => { await rdbStore.clearSearchHistory(); this.history = []; })
          }.width('100%').padding({ left: 20, right: 20, top: 16, bottom: 10 })

          Flex({ wrap: FlexWrap.Wrap }) {
            ForEach(this.history, (kw: string) => {
              Text(kw).fontSize(14).fontColor(this.theme.colors.text)
                .backgroundColor(this.theme.colors.surface)
                .padding({ left: 15, right: 15, top: 6, bottom: 6 })
                .borderRadius(20).margin({ right: 10, bottom: 10 })
                .onClick(() => { this.keyword = kw; this.runSearch(kw); })
            }, (kw: string) => kw)
          }.width('100%').padding({ left: 20, right: 20 })
        }

        if (this.hotSearches.length > 0) {
          Text(t('search.hotSearchList')).fontSize(16).fontWeight(FontWeight.Bold)
            .fontColor(this.theme.colors.text)
            .width('100%').padding({ left: 20, right: 20, top: 24, bottom: 10 })

          Column() {
            ForEach(this.hotSearches, (item: HotItem, idx: number) => {
              Row({ space: 15 }) {
                Text(`${idx + 1}`)
                  .fontSize(16).fontWeight(FontWeight.Bold).width(20).textAlign(TextAlign.Center)
                  .fontColor(idx < 3 ? this.theme.colors.primary : this.theme.colors.textSecondary)
                Text(item.keyword).fontSize(15).fontColor(this.theme.colors.text).layoutWeight(1)
                if (idx < 3) {
                  Text('HOT').fontSize(10).fontWeight(FontWeight.Bold)
                    .fontColor(this.theme.colors.background)
                    .backgroundColor(this.theme.colors.primary)
                    .padding({ left: 4, right: 4, top: 1, bottom: 1 }).borderRadius(3)
                }
              }
              .width('100%').padding({ top: 12, bottom: 12 })
              .onClick(() => { this.keyword = item.keyword; this.runSearch(item.keyword); })
            }, (item: HotItem, idx: number) => `${idx}-${item.keyword}`)
          }.width('100%').padding({ left: 20, right: 20 })
        }
      }
      .width('100%').alignItems(HorizontalAlign.Start)
    }
    .layoutWeight(1).scrollBar(BarState.Off).align(Alignment.Top)
  }

  // ─── 搜索结果：分段列表（对齐 mobile sections） ───
  @Builder
  resultsView() {
    List() {
      // 艺术家
      if (this.artists.length > 0) {
        ListItem() {
          Text(t('search.tab.artist')).fontSize(18).fontWeight(FontWeight.Bold)
            .fontColor(this.theme.colors.text)
            .width('100%').padding({ left: 20, right: 20, top: 16, bottom: 8 })
        }
        ForEach(this.artists, (ar: ArtistDto) => {
          ListItem() { this.ItemRow(ar.avatar, ar.name, t('common.artists'), 'artist', String(ar.id)) }
        }, (ar: ArtistDto) => `ar-${ar.id}`)
      }
      // 专辑
      if (this.albums.length > 0) {
        ListItem() {
          Text(t('search.tab.album')).fontSize(18).fontWeight(FontWeight.Bold)
            .fontColor(this.theme.colors.text)
            .width('100%').padding({ left: 20, right: 20, top: 16, bottom: 8 })
        }
        ForEach(this.albums, (a: AlbumDto) => {
          ListItem() { this.ItemRow(a.cover, a.name, a.artist ?? '', 'album', String(a.id)) }
        }, (a: AlbumDto) => `al-${a.id}`)
      }
      // 单曲
      if (this.tracks.length > 0) {
        ListItem() {
          Text(t('search.tab.track')).fontSize(18).fontWeight(FontWeight.Bold)
            .fontColor(this.theme.colors.text)
            .width('100%').padding({ left: 20, right: 20, top: 16, bottom: 8 })
        }
        ForEach(this.tracks, (tr: TrackDto) => {
          ListItem() { this.ItemRow(tr.cover, tr.name, tr.artist ?? '', 'track', String(tr.id)) }
        }, (tr: TrackDto) => `tr-${tr.id}`)
      }
    }
    .layoutWeight(1).scrollBar(BarState.Off).divider({ strokeWidth: 0.5, color: this.theme.colors.border, startMargin: 80, endMargin: 15 })
  }

  @Builder
  ItemRow(cover: string | undefined, name: string, subtitle: string, type: string, id: string) {
    Row() {
      CoverImage({
        path: cover ?? null,
        imgWidth: 50, imgHeight: 50,
        radius: type === 'artist' ? 25 : 8,
        fallbackText: name,
      })
      Column() {
        Text(name).fontSize(16).fontWeight(FontWeight.Medium).fontColor(this.theme.colors.text)
          .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
        Text(subtitle).fontSize(13).fontColor(this.theme.colors.textSecondary).margin({ top: 4 })
          .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .layoutWeight(1).margin({ left: 15 }).alignItems(HorizontalAlign.Start)

      // 右侧操作按钮
      if (type === 'track' || type === 'album') {
        Button() {
          AppIcon({
            name: type === 'track'
              ? (this.likedTrackIds.includes(id) ? 'heart-fill' : 'heart')
              : (this.likedAlbumIds.includes(id) ? 'heart-fill' : 'heart'),
            iconSize: 20,
            color: (type === 'track' ? this.likedTrackIds.includes(id) : this.likedAlbumIds.includes(id))
              ? this.theme.colors.primary : this.theme.colors.textSecondary,
          })
        }
        .width(36).height(36).backgroundColor(Color.Transparent)
        .onClick(() => {
          if (type === 'track') this.toggleTrackLike(id);
          else this.toggleAlbumLike(id);
        })
      }
      if (type !== 'track') {
        Text('›').fontSize(20).fontColor(this.theme.colors.textSecondary).margin({ left: 4 })
      }
    }
    .width('100%').padding({ left: 15, right: 15, top: 12, bottom: 12 })
    .onClick(() => {
      if (type === 'track') {
        this.playTrack(id);
      } else if (type === 'album') {
        router.pushUrl({ url: 'pages/AlbumDetailPage', params: { id: id } });
      } else if (type === 'artist') {
        router.pushUrl({ url: 'pages/ArtistDetailPage', params: { id: id } });
      }
    })
  }

  private async playTrack(trackId: string): Promise<void> {
    try {
      let target: TrackDto | null = null;
      for (const tr of this.tracks) {
        if (String(tr.id) === trackId) { target = tr; break; }
      }
      if (!target) return;
      const list = [await resolveTrackToPlayer(target, false)];
      await playerStore.playTrackList(list, 0);
      router.pushUrl({ url: 'pages/PlayerPage' });
    } catch (e) {
      Logger.w('Search', `playTrack: ${String(e)}`);
    }
  }
}
