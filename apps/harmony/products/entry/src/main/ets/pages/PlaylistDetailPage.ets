import router from '@ohos.router';
import { buildTheme, CommonNavBar, CommonButton, EmptyView, SkeletonBlock } from 'features_ui';
import { t } from 'features_i18n';
import { formatDuration } from 'audiodock_common';
import { playlistApi } from 'features_network';
import type { PlaylistDto, TrackDto } from 'features_network';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { likesHistory, EventPayloadId } from '../services/LikesHistoryService';
import { playerStore } from '../context/PlayerStore';
import type { Track } from '../context/PlayerStore';

interface PlaylistDetail extends PlaylistDto { tracks: TrackDto[] }

@Entry
@Component
struct PlaylistDetailPage {
  @State data: PlaylistDetail | null = null;
  @State loading: boolean = true;
  @State error: string = '';
  @State liked: boolean = false;
  private entityId: string = '';
  private theme = buildTheme('light');
  private unsub: () => void = () => {};

  aboutToAppear(): void {
    interface RouterParams { id?: string }
    const p = router.getParams() as RouterParams;
    this.entityId = p.id ?? '';
    this.load();
    this.unsub = likesHistory.on('albumLike', (e) => {
      const ev = e as EventPayloadId;
      if (ev.id === this.entityId) this.liked = ev.liked;
    });
    likesHistory.isAlbumLiked(this.entityId).then((v) => this.liked = v).catch(() => undefined);
  }

  aboutToDisappear(): void {
    this.unsub();
  }

  build() {
    Column() {
      CommonNavBar({ title: this.data?.name ?? '', theme: this.theme,
        onBack: () => router.back() });
      if (this.loading) {
        Column({ space: 12 }) {
          SkeletonBlock({ blockHeight: 160, theme: this.theme });
          SkeletonBlock({ blockWidth: '60%', blockHeight: 20, theme: this.theme });
        }.padding(16);
      } else if (this.error || !this.data) {
        EmptyView({ message: this.error || t('detail.retry_failed'), theme: this.theme });
      } else {
        this.content();
      }
    }.width('100%').height('100%').backgroundColor(this.theme.colors.background);
  }

  @Builder content() {
    Column({ space: 12 }) {
      Text(this.data!.name).fontSize(22).fontWeight(FontWeight.Bold);
      if (this.data!.description) {
        Text(this.data!.description).fontSize(13)
          .fontColor(this.theme.colors.textSecondary).maxLines(4);
      }
      CommonButton({
        label: t('player.title'),
        theme: this.theme, onButtonClick: async () => {
          if (!this.data || this.data.tracks.length === 0) return;
          const tracks: Track[] = [];
          for (const x of this.data.tracks) tracks.push(await resolveTrackToPlayer(x, false));
          await playerStore.playTrackList(tracks, 0);
          router.pushUrl({ url: 'pages/PlayerPage' });
        },
      });
      CommonButton({
        label: this.liked ? t('detail.unlike') : t('detail.like'),
        theme: this.theme, variant: this.liked ? 'secondary' : 'primary',
        onButtonClick: () => {
          if (this.liked) likesHistory.unlikeAlbum(this.entityId);
          else likesHistory.likeAlbum(this.entityId);
        },
      });
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
    }.padding(16);
  }

  private async load(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      this.data = await playlistApi.getById(this.entityId) as PlaylistDetail;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }
}
