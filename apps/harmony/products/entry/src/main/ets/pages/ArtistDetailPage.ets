import router from '@ohos.router';
import { buildTheme, CommonNavBar, EmptyView, SkeletonBlock } from 'features_ui';
import { t } from 'features_i18n';
import { formatDuration } from 'audiodock_common';
import { artistApi } from 'features_network';
import type { ArtistDto, AlbumDto, TrackDto } from 'features_network';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { playerStore } from '../context/PlayerStore';
import type { Track } from '../context/PlayerStore';

interface ArtistDetail { artist: ArtistDto; albums: AlbumDto[]; tracks: TrackDto[] }

@Entry
@Component
struct ArtistDetailPage {
  @State data: ArtistDetail | null = null;
  @State loading: boolean = true;
  @State error: string = '';
  @State subTab: number = 0; // 0 = tracks, 1 = albums
  private id: string = '';
  private theme = buildTheme('light');

  aboutToAppear(): void {
    const p = router.getParams() as Record<string, string>;
    this.id = p['id'] ?? '';
    this.load();
  }

  build() {
    Column() {
      CommonNavBar({ title: this.data?.artist?.name ?? '', theme: this.theme,
        onBack: () => router.back() });
      if (this.loading) {
        Column({ space: 12 }) {
          SkeletonBlock({ blockHeight: 120, theme: this.theme });
          SkeletonBlock({ blockWidth: '50%', blockHeight: 20, theme: this.theme });
        }.padding(16);
      } else if (this.error || !this.data) {
        EmptyView({ message: this.error || t('detail.retry_failed'), theme: this.theme });
      } else {
        this.content();
      }
    }.width('100%').height('100%').backgroundColor(this.theme.colors.background);
  }

  @Builder content() {
    Column() {
      Text(this.data!.artist.name).fontSize(22).fontWeight(FontWeight.Bold).margin({ top: 16 });
      if (this.data!.artist.description) {
        Text(this.data!.artist.description)
          .fontSize(13).fontColor(this.theme.colors.textSecondary)
          .maxLines(4).margin({ top: 8 });
      }
      // Sub-tab row (text-only to avoid nested Tabs)
      Row({ space: 24 }) {
        Text('热门单曲')
          .fontColor(this.subTab === 0 ? this.theme.colors.primary : this.theme.colors.textSecondary)
          .onClick(() => this.subTab = 0);
        Text('专辑')
          .fontColor(this.subTab === 1 ? this.theme.colors.primary : this.theme.colors.textSecondary)
          .onClick(() => this.subTab = 1);
      }.margin({ top: 16, left: 16 });

      if (this.subTab === 0) {
        List() {
          ForEach(this.data!.tracks, (tr: TrackDto) => {
            ListItem() {
              Row() {
                Text(tr.title).layoutWeight(1).fontSize(15);
                Text(formatDuration((tr.duration ?? 0) * 1000))
                  .fontSize(12).fontColor(this.theme.colors.textSecondary);
              }.padding(12);
            }
            .onClick(async () => {
              const tracks: Track[] = [];
              for (const x of this.data!.tracks) tracks.push(await resolveTrackToPlayer(x, false));
              const idx = this.data!.tracks.findIndex((x) => x.id === tr.id);
              await playerStore.playTrackList(tracks, idx >= 0 ? idx : 0);
              router.pushUrl({ url: 'pages/PlayerPage' });
            });
          }, (tr: TrackDto) => tr.id);
        }.layoutWeight(1);
      } else {
        Grid() {
          ForEach(this.data!.albums, (a: AlbumDto) => {
            GridItem() {
              Column() {
                Text(a.name).fontSize(14).maxLines(2);
                Text(a.artist ?? '').fontSize(12)
                  .fontColor(this.theme.colors.textSecondary);
              }.padding(8);
            }
            .onClick(() => router.pushUrl({ url: 'pages/AlbumDetailPage', params: { id: a.id } }));
          }, (a: AlbumDto) => a.id);
        }.columnsTemplate('1fr 1fr').layoutWeight(1).padding(8);
      }
    }.padding(0);
  }

  private async load(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      this.data = await artistApi.getById(this.id) as ArtistDetail;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }
}
