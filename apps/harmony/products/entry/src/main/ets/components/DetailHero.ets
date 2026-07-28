import { buildTheme } from 'features_ui';
import type { Theme } from 'features_ui';
import { CoverImage } from './CoverImage';

/**
 * 详情页顶部：居中大封面 + 标题 + 副标题。
 * 专辑页用方形 200，艺人页用圆形 150（circle=true 时圆角取 size/2）。
 * progress > 0 时在封面底部叠一条进度条（有声书）。
 * 对齐 mobile: apps/mobile/app/album/[id].tsx 的 styles.header/cover/title/artist。
 */
@Component
export struct DetailHero {
  @Prop coverPath: string | null = null;
  /** 不能叫 size —— 会和 CustomComponent 内建的 size() 属性冲突。 */
  @Prop heroSize: number = 200;
  @Prop circle: boolean = false;
  @Prop title: string = '';
  @Prop subtitle: string = '';
  @Prop progress: number = 0;
  @Prop theme: Theme = buildTheme('light');

  build() {
    Column() {
      Stack({ alignContent: Alignment.Bottom }) {
        CoverImage({
          path: this.coverPath,
          imgWidth: this.heroSize,
          imgHeight: this.heroSize,
          radius: this.circle ? this.heroSize / 2 : 10,
          fallbackText: this.title,
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
          .width(this.heroSize - 6)
          .margin({ bottom: 5 })
        }
      }
      .width(this.heroSize)
      .height(this.heroSize)
      .margin({ bottom: 15 })

      Text(this.title)
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.theme.colors.text)
        .textAlign(TextAlign.Center)
        .margin({ bottom: 5 })

      if (this.subtitle.length > 0) {
        Text(this.subtitle)
          .fontSize(18)
          .fontColor(this.theme.colors.textSecondary)
          .textAlign(TextAlign.Center)
      }
    }
    .width('100%')
    .alignItems(HorizontalAlign.Center)
  }
}
