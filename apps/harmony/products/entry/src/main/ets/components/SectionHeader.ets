import { buildTheme } from 'features_ui';
import type { Theme } from 'features_ui';
import { AppIcon } from './AppIcon';

/**
 * 艺人页的区块标题行，右侧可带一个播放按钮。
 * 对齐 mobile: apps/mobile/app/artist/[id].tsx 的 styles.sectionTitle / sectionHeaderRow。
 */
@Component
export struct SectionHeader {
  @Prop title: string = '';
  @Prop showAction: boolean = false;
  @Prop theme: Theme = buildTheme('light');
  onActionClick: () => void = () => {};

  build() {
    Row() {
      Text(this.title)
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.theme.colors.text)
        .layoutWeight(1)
      if (this.showAction) {
        Column() {
          AppIcon({ name: 'play', iconSize: 20, color: this.theme.colors.onPrimary })
        }
        .width(36)
        .height(36)
        .borderRadius(18)
        .backgroundColor(this.theme.colors.primary)
        .justifyContent(FlexAlign.Center)
        .onClick(() => this.onActionClick())
      }
    }
    .width('100%')
    .alignItems(VerticalAlign.Center)
    .padding({ left: 20, right: 20 })
    .margin({ bottom: 15 })
  }
}
