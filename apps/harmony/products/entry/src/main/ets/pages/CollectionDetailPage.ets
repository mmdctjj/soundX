import router from '@ohos.router';
import { buildTheme, CommonNavBar, CommonButton, EmptyView, SkeletonBlock } from 'features_ui';
import { t } from 'features_i18n';
import { collectionApi } from 'features_network';
import type { CollectionDetailResp, CollectionAlbumItem } from 'features_network';
import { likesHistory, EventPayloadId } from '../services/LikesHistoryService';

@Entry
@Component
struct CollectionDetailPage {
  @State data: CollectionDetailResp | null = null;
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
      CommonButton({
        label: this.liked ? t('detail.unlike') : t('detail.like'),
        theme: this.theme, variant: this.liked ? 'secondary' : 'primary',
        onButtonClick: () => {
          if (this.liked) likesHistory.unlikeAlbum(this.entityId);
          else likesHistory.likeAlbum(this.entityId);
        },
      });
      List() {
        ForEach(this.data!.items ?? [], (it: CollectionAlbumItem) => {
          ListItem() {
            Row() {
              Text(it.album?.name ?? '').layoutWeight(1).fontSize(15);
            }.padding(12);
          }
          .onClick(() => {
            if (it.album) {
              router.pushUrl({ url: 'pages/AlbumDetailPage', params: { id: it.album.id } });
            }
          });
        }, (it: CollectionAlbumItem) => it.id);
      }.layoutWeight(1);
    }.padding(16);
  }

  private async load(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      this.data = await collectionApi.getById(this.entityId);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }
}
