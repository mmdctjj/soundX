import { buildTheme, type Theme } from '../theme/Theme';

@Component
export struct EmptyView {
  @Prop message: string = '暂无数据';
  @Prop theme: Theme = buildTheme('light');

  build() {
    Column() {
      Text(this.message)
        .fontSize(this.theme.typography.body.fontSize)
        .fontColor(this.theme.colors.textSecondary);
    }
    .width('100%').height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center);
  }
}