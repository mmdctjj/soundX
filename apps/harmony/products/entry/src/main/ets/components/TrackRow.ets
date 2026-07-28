import { formatDuration } from 'audiodock_common';
import { buildTheme } from 'features_ui';
import type { Theme } from 'features_ui';
import { t } from 'features_i18n';
import { CoverImage } from './CoverImage';

/**
 * 详情页的曲目行，专辑页与艺人页共用。
 * 对齐 mobile: apps/mobile/app/album/[id].tsx 的 styles.trackItem 一族。
 * 布局: [序号槽 50] [封面 20] [曲名 + 来源标签] [已听 x%] [时长]
 */
@Component
export struct TrackRow {
  @Prop index: number = 0;
  @Prop name: string = '';
  @Prop source: string = '';
  @Prop duration: number = 0;
  @Prop coverPath: string | null = null;
  @Prop isCurrent: boolean = false;
  /** 仅当前播放的有声书曲目会有值，其余传 0；数据来源见 spec。 */
  @Prop listenedPercent: number = 0;
  @Prop theme: Theme = buildTheme('light');
  onRowClick: () => void = () => {};

  private sourceLabel(): string {
    if (this.source.length === 0) return '';
    return this.source === 'WEBDAV' ? t('trackList.sourceWebdav') : t('trackList.sourceFile');
  }

  build() {
    Row() {
      Column() {
        Text(this.isCurrent ? '▶' : String(this.index + 1))
          .fontSize(14)
          .fontColor(this.isCurrent ? this.theme.colors.primary : this.theme.colors.textSecondary)
          .textAlign(TextAlign.Center)
      }
      .width(50)
      .justifyContent(FlexAlign.Center)

      CoverImage({
        path: this.coverPath,
        imgWidth: 20,
        imgHeight: 20,
        radius: 2,
        fallbackText: this.name,
        fallbackBg: '#52B54B',
      })

      Row() {
        Text(this.name)
          .fontSize(16)
          .fontColor(this.theme.colors.text)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .layoutWeight(1)
        if (this.sourceLabel().length > 0) {
          Text(this.sourceLabel())
            .fontSize(10)
            .fontColor(this.theme.colors.textSecondary)
            .margin({ left: 6 })
        }
      }
      .layoutWeight(1)
      .margin({ left: 10, right: 10 })

      if (this.listenedPercent > 0) {
        Text(`${t('playerPage.listened')}${this.listenedPercent}%`)
          .fontSize(10)
          .fontColor(this.theme.colors.primary)
          .margin({ right: 10 })
      }

      Text(formatDuration(this.duration * 1000))
        .fontSize(12)
        .fontColor(this.theme.colors.textSecondary)
    }
    .width('100%')
    .alignItems(VerticalAlign.Center)
    .padding({ top: 12, bottom: 12 })
    .borderWidth({ bottom: 1 })
    .borderColor(this.theme.colors.border)
    .onClick(() => this.onRowClick())
  }
}
