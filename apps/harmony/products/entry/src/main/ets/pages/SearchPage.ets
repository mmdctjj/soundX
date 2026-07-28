import router from '@ohos.router';
import { buildTheme, CommonNavBar, EmptyView } from 'features_ui';
import type { ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { trackApi, albumApi, artistApi, playlistApi } from 'features_network';
import type { TrackDto, AlbumDto, ArtistDto, PlaylistDto } from 'features_network';
import { rdbStore } from 'features_storage';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { playerStore } from '../context/PlayerStore';
import { MiniPlayer } from '../components/MiniPlayer';

const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 30;

@Entry
@Component
struct SearchPage {
  @State keyword: string = '';
  @State activeTab: number = 0; // 0=track 1=album 2=artist 3=playlist
  @State tracks: TrackDto[] = [];
  @State albums: AlbumDto[] = [];
  @State artists: ArtistDto[] = [];
  @State playlists: PlaylistDto[] = [];
  @State searching: boolean = false;
  @State hot: string[] = [];
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  private theme = buildTheme('light');
  private debounceTimer: number | null = null;
  private reqSeq: number = 0;

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    this.loadHot();
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  aboutToDisappear(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
  }

  build() {
    Column() {
      CommonNavBar({ title: '', theme: this.theme, showBack: true,
        onBack: () => router.back() });
      Row({ space: 8 }) {
        TextInput({ placeholder: t('search.placeholder'), text: this.keyword })
          .layoutWeight(1).height(40).borderRadius(20)
          .padding({ left: 16, right: 16 })
          .onChange((v: string) => {
            this.keyword = v;
            this.scheduleSearch();
          });
        Text('Search')
          .fontColor(this.theme.colors.primary)
          .onClick(() => this.runSearch(this.keyword));
      }.padding(12);
      if (this.keyword.trim().length === 0) {
        this.hotView();
      } else {
        this.resultsView();
      }
      MiniPlayer()
    }.width('100%').height('100%').backgroundColor(this.theme.colors.background);
  }

  @Builder hotView() {
    Column() {
      Row() {
        Text(t('search.hot_words'))
          .fontSize(14).fontColor(this.theme.colors.textSecondary).layoutWeight(1);
        Text(t('search.history_clear'))
          .fontSize(13).fontColor(this.theme.colors.primary)
          .onClick(async () => {
            await rdbStore.clearSearchHistory();
            this.hot = [];
          });
      }.padding(12);
      Flex({ wrap: FlexWrap.Wrap }) {
        ForEach(this.hot, (kw: string) => {
          Text(kw)
            .fontSize(13)
            .backgroundColor(this.theme.colors.surfaceAlt)
            .padding({ left: 12, right: 12, top: 6, bottom: 6 })
            .borderRadius(16)
            .margin(6)
            .onClick(() => {
              this.keyword = kw;
              this.runSearch(kw);
            });
        }, (kw: string) => kw);
      }.padding(12);
    }.alignItems(HorizontalAlign.Start).layoutWeight(1);
  }

  @Builder resultsView() {
    Column() {
      Tabs({ barPosition: BarPosition.Start }) {
        TabContent() { this.trackList(); }.tabBar(t('search.tab.track'));
        TabContent() { this.albumGrid(); }.tabBar(t('search.tab.album'));
        TabContent() { this.artistList(); }.tabBar(t('search.tab.artist'));
        TabContent() { this.playlistList(); }.tabBar(t('search.tab.playlist'));
      }
      .onChange((i: number) => this.activeTab = i)
      .layoutWeight(1);
    };
  }

  @Builder trackList() {
    if (this.tracks.length === 0 && !this.searching) {
      EmptyView({ message: t('search.empty'), theme: this.theme });
    } else {
      List() {
        ForEach(this.tracks, (tr: TrackDto) => {
          ListItem() {
            Text(tr.name).fontSize(15).padding(12);
          }
          .onClick(async () => {
            const resolved = await resolveTrackToPlayer(tr, false);
            await playerStore.playTrackList([resolved], 0);
            router.pushUrl({ url: 'pages/PlayerPage' });
          });
        }, (tr: TrackDto) => tr.id);
      };
    }
  }

  @Builder albumGrid() {
    if (this.albums.length === 0 && !this.searching) {
      EmptyView({ message: t('search.empty'), theme: this.theme });
    } else {
      List() {
        ForEach(this.albums, (a: AlbumDto) => {
          ListItem() {
            Text(`${a.name}${a.artist ? ' · ' + a.artist : ''}`)
              .fontSize(15).padding(12);
          }
          .onClick(() => router.pushUrl({ url: 'pages/AlbumDetailPage', params: { id: a.id } }));
        }, (a: AlbumDto) => a.id);
      };
    }
  }

  @Builder artistList() {
    if (this.artists.length === 0 && !this.searching) {
      EmptyView({ message: t('search.empty'), theme: this.theme });
    } else {
      List() {
        ForEach(this.artists, (ar: ArtistDto) => {
          ListItem() {
            Text(ar.name).fontSize(15).padding(12);
          }
          .onClick(() => router.pushUrl({ url: 'pages/ArtistDetailPage', params: { id: ar.id } }));
        }, (ar: ArtistDto) => ar.id);
      };
    }
  }

  @Builder playlistList() {
    if (this.playlists.length === 0 && !this.searching) {
      EmptyView({ message: t('search.empty'), theme: this.theme });
    } else {
      List() {
        ForEach(this.playlists, (pl: PlaylistDto) => {
          ListItem() {
            Text(pl.name).fontSize(15).padding(12);
          }
          .onClick(() => router.pushUrl({ url: 'pages/PlaylistDetailPage', params: { id: pl.id } }));
        }, (pl: PlaylistDto) => pl.id);
      };
    }
  }

  private scheduleSearch(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout((): void => { this.runSearch(this.keyword); }, DEBOUNCE_MS);
  }

  private async loadHot(): Promise<void> {
    this.hot = await rdbStore.listSearchKeywords(20);
  }

  private async searchPlaylists(keyword: string): Promise<PlaylistDto[]> {
    const all = await playlistApi.list();
    const lower = keyword.toLowerCase();
    const hit: PlaylistDto[] = [];
    for (let i = 0; i < all.length && hit.length < RESULT_LIMIT; i++) {
      if (all[i].name.toLowerCase().includes(lower)) hit.push(all[i]);
    }
    return hit;
  }

  private async runSearch(kw: string): Promise<void> {
    const trimmed = kw.trim();
    if (trimmed.length === 0) return;
    const seq = ++this.reqSeq;
    this.searching = true;
    await rdbStore.upsertSearchKeyword(trimmed);
    const results = await Promise.allSettled([
      trackApi.search({ keyword: trimmed, limit: RESULT_LIMIT }),
      albumApi.search(trimmed, RESULT_LIMIT),
      artistApi.search(trimmed, RESULT_LIMIT),
      // 后端没有 /playlists/search 路由，改为拉全量后在本地过滤（播放列表数量很少）。
      this.searchPlaylists(trimmed),
    ]);
    if (seq !== this.reqSeq) return; // a newer request superseded this one
    this.tracks = results[0].status === 'fulfilled' ? results[0].value : [];
    this.albums = results[1].status === 'fulfilled' ? results[1].value : [];
    this.artists = results[2].status === 'fulfilled' ? results[2].value : [];
    this.playlists = results[3].status === 'fulfilled' ? results[3].value : [];
    this.searching = false;
    this.loadHot();
  }
}