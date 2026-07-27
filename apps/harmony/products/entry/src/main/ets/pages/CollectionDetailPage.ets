import router from '@ohos.router';
import { buildTheme, CommonNavBar, EmptyView, SkeletonBlock } from 'features_ui';
import { t } from 'features_i18n';
import { collectionApi } from 'features_network';
import type { CollectionDto } from 'features_network';

interface CollectionDetail extends CollectionDto { audiobooks: AudiobookStub[] }
interface AudiobookStub { id: string; title: string; duration?: number }

@Entry
@Component
struct CollectionDetailPage {
  @State data: CollectionDetail | null = null;
  @State loading: boolean = true;
  @State error: string = '';
  private id: string = '';
  private theme = buildTheme('light');

  aboutToAppear(): void {
    const p = router.getParams() as Record<string, string>;
    this.id = p['id'] ?? '';
    this.load();
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
      List() {
        ForEach(this.data!.audiobooks, (ab: AudiobookStub) => {
          ListItem() {
            Row() {
              Text(ab.title).layoutWeight(1).fontSize(15);
            }.padding(12);
          }
          .onClick(() => { /* audiobook detail deferred to P4 */ });
        }, (ab: AudiobookStub) => ab.id);
      }.layoutWeight(1);
    }.padding(16);
  }

  private async load(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      this.data = await collectionApi.getById(this.id) as CollectionDetail;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }
}
