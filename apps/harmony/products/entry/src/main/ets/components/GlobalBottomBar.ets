import router from '@ohos.router';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { AppIcon, AppIconName } from './AppIcon';
import { MiniPlayer } from './MiniPlayer';

/**
 * 全局底部 Tab 栏，对齐 mobile 的 GlobalBottomBar：
 * MiniPlayer + 三个 tab（推荐/声仓/我的）。
 * 在详情页（搜索/专辑/艺术家/播放列表/合集）底部展示，
 * 点击 tab 返回 MainPage 并切换到对应 tab。
 */
@Component
export struct GlobalBottomBar {
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @StorageProp('appLang') appLang: string = 'zh-CN';
  @State theme: Theme = buildTheme('light');

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
  }

  private switchToTab(index: number): void {
    // 通过 AppStorage 通知 MainPage 切换 tab，然后返回
    AppStorage.setOrCreate('mainTabIndex', index);
    router.back();
  }

  build() {
    Column() {
      MiniPlayer()

      Row() {
        this.TabItem(t('navTabs.recommend'), 'home', 0)
        this.TabItem(t('navTabs.soundcang'), 'headphones', 1)
        this.TabItem(t('navTabs.mine'), 'person', 2)
      }
      .width('100%').height(56)
      .justifyContent(FlexAlign.SpaceAround)
      .alignItems(VerticalAlign.Center)
      .backgroundColor(this.theme.colors.surface)
      .border({ width: { top: 0.5 }, color: this.theme.colors.border })
    }
    .width('100%')
  }

  @Builder
  TabItem(label: string, icon: AppIconName, index: number) {
    Column() {
      AppIcon({ name: icon, iconSize: 24, color: this.theme.colors.tabBarInactive })
        .margin({ bottom: 4 })
      Text(label)
        .fontSize(12)
        .fontColor(this.theme.colors.tabBarInactive)
    }
    .width('33%').height(56).justifyContent(FlexAlign.Center)
    .onClick(() => this.switchToTab(index))
  }
}
