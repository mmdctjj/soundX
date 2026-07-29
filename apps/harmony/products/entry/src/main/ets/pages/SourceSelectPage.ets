import router from '@ohos.router';
import { buildTheme, type Theme, type ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { SOURCEMAP, SOURCETIPSMAP } from '../utils/networkUtils';

/**
 * 数据源选择页，1:1 对齐 mobile 的 LoginSelectionScreen（app/login.tsx）：
 * 顶部居中 App Logo + 标题 + 副标题；下方按 SOURCEMAP 顺序列出各数据源卡片
 * （图标 + 名称 + 描述 + 右侧箭头），点按携带 sourceType 进入登录页。
 */
@Entry
@Component
struct SourceSelectPage {
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @State theme: Theme = buildTheme('light');

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  private logoResource(key: string): Resource {
    if (key === 'Subsonic') {
      return $r('app.media.subsonic');
    }
    if (key === 'Emby') {
      return $r('app.media.emby');
    }
    return $r('app.media.logo');
  }

  private handleSelect(key: string): void {
    router.pushUrl({ url: 'pages/LoginPage', params: { sourceType: key } });
  }

  build() {
    Column() {
      Scroll() {
        Column() {
          // 顶部：居中 Logo + 标题 + 副标题
          Column() {
            Image($r('app.media.logo'))
              .width(100)
              .height(100)
              .borderRadius(16)
              .margin({ bottom: 20 })
            Text(t('loginSelect.title'))
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.theme.colors.text)
              .margin({ bottom: 10 })
            Text(t('loginSelect.subtitle'))
              .fontSize(12)
              .fontColor(this.theme.colors.textSecondary)
              .textAlign(TextAlign.Center)
          }
          .width('100%')
          .alignItems(HorizontalAlign.Center)
          .margin({ top: 40, bottom: 40 })

          // 数据源卡片列表
          Column({ space: 15 }) {
            ForEach(Object.keys(SOURCEMAP), (key: string) => {
              Row() {
                Image(this.logoResource(key))
                  .width(50)
                  .height(50)
                  .margin({ right: 15 })
                Column() {
                  Text(key)
                    .fontSize(18)
                    .fontWeight(FontWeight.Bold)
                    .fontColor(this.theme.colors.text)
                    .margin({ bottom: 4 })
                  Text(SOURCETIPSMAP[key] ?? '')
                    .fontSize(12)
                    .fontColor(this.theme.colors.textSecondary)
                    .maxLines(2)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                }
                .layoutWeight(1)
                .alignItems(HorizontalAlign.Start)
                Text('›')
                  .fontSize(28)
                  .fontColor(this.theme.colors.text)
                  .margin({ left: 10 })
              }
              .width('100%')
              .padding(20)
              .borderRadius(16)
              .borderWidth(1)
              .borderColor(this.theme.colors.border)
              .backgroundColor(this.theme.colors.surface)
              .onClick(() => this.handleSelect(key))
            }, (key: string) => key)
          }
          .width('100%')
        }
        .width('100%')
        .padding({ left: 20, right: 20, bottom: 40 })
        .constraintSize({ maxWidth: 600 })
      }
      .layoutWeight(1)
      .scrollBar(BarState.Off)
      .align(Alignment.Top)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.theme.colors.background)
  }
}
