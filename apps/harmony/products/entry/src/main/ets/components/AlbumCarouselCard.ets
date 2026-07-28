import { buildTheme } from 'features_ui';
import type { Theme } from 'features_ui';
import { CoverImage } from './CoverImage';

/**
 * 艺人页横向滚动区块里的卡片（专辑 / 合作专辑 / 相关合集 / MV 共用）。
 * 对齐 mobile: apps/mobile/app/artist/[id].tsx 的 styles.albumCard 一族。
 */
@Component
export struct AlbumCarouselCard {
  @Prop coverPath: string | null = null;
  @Prop name: string = '';
  @Prop progress: number = 0;
  @Prop theme: Theme = buildTheme('light');
  onCardClick: () => void = () => {};

  build() {
    Column() {
      Stack({ alignContent: Alignment.Bottom }) {
        CoverImage({
          path: this.coverPath,
          imgWidth: 120,
          imgHeight: 120,
          radius: 10,
          fallbackText: this.name,
          fallbackBg: '#5B8FF9',
        })
        if (this.progress > 0) {
          Stack({ alignContent: Alignment.Start }) {
            Row()
              .width('100%')
              .height(4)
              .backgroundColor('rgba(255,255,255,0.3)')
            Row()
              .width(`${this.progress}%`)
              .height(4)
              .backgroundColor(this.theme.colors.primary)
          }
          .width(114)
          .margin({ bottom: 5 })
        }
      }
      .width(120)
      .height(120)
      .margin({ bottom: 5 })

      Text(this.name)
        .fontSize(14)
        .fontColor(this.theme.colors.text)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .textAlign(TextAlign.Center)
        .width(120)
    }
    .margin({ right: 15 })
    .onClick(() => this.onCardClick())
  }
}
