import router from '@ohos.router';
import { kvStore } from 'features_storage';
import { Logger } from 'audiodock_common';
import { authStore } from '../context/AuthStore';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';

class ThemeOption {
  key: ThemeMode = 'light';
  label: string = '';

  constructor(key: ThemeMode, label: string) {
    this.key = key;
    this.label = label;
  }
}

@Entry
@Component
struct SettingsPage {
  @State serverAddress: string = '';
  @State serverType: string = '';
  @State username: string = '';
  @State version: string = '1.0.0';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  private theme: Theme = buildTheme('light');

  private themeOptions: ThemeOption[] = [
    new ThemeOption('light', '浅色'),
    new ThemeOption('dark', '深色'),
    new ThemeOption('festive', '节日'),
  ];

  aboutToAppear() {
    this.theme = buildTheme(this.themeMode);
    this.loadSettings();
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  async loadSettings() {
    try {
      this.serverAddress = authStore.state_.serverAddress;
      this.serverType = authStore.state_.sourceType;
      this.username = authStore.state_.user?.username ?? '';
    } catch (e) {
      Logger.w('SettingsPage', `load settings failed: ${String(e)}`);
    }
  }

  goBack() {
    router.back();
  }

  navigateToSourceManage() {
    router.pushUrl({ url: 'pages/SourceManagePage' });
  }

  setThemeMode(mode: ThemeMode): void {
    AppStorage.setOrCreate('themeMode', mode);
    kvStore.set('themeMode', mode);
  }

  async logout() {
    try {
      // authStore.logout() 负责清 token_/user_/device_ 并重置内存态；
      // 这里再清掉数据源选择，让用户回到数据源选择页。
      await authStore.logout();
      await kvStore.delete('serverAddress');
      await kvStore.delete('selectedSourceType');
      router.replaceUrl({ url: 'pages/SourceSelectPage' });
    } catch (e) {
      Logger.e('SettingsPage', `logout failed: ${String(e)}`);
    }
  }

  build() {
    Column() {
      Row() {
        Button('←')
          .width(40)
          .height(40)
          .backgroundColor(Color.Transparent)
          .fontSize(24)
          .fontColor(this.theme.colors.text)
          .onClick(() => this.goBack())

        Text('设置')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.theme.colors.text)
          .layoutWeight(1)
          .textAlign(TextAlign.Center)
      }
      .width('100%')
      .padding({ left: 8, right: 8, top: 16, bottom: 8 })

      Scroll() {
        Column() {
          // Theme
          Column() {
            Text('主题')
              .fontSize(13)
              .fontColor(this.theme.colors.textSecondary)
              .margin({ top: 16, bottom: 8, left: 16, right: 16 })
              .width('100%')

            Row() {
              ForEach(this.themeOptions, (option: ThemeOption) => {
                Button(option.label)
                  .backgroundColor(this.themeMode === option.key ? this.theme.colors.primary : Color.Transparent)
                  .fontColor(this.themeMode === option.key ? this.theme.colors.onPrimary : this.theme.colors.text)
                  .borderRadius(16)
                  .height(32)
                  .margin({ right: 8 })
                  .onClick(() => this.setThemeMode(option.key))
              }, (option: ThemeOption) => option.key)
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
          }
          .width('100%')
          .backgroundColor(this.theme.colors.surface)
          .borderRadius(12)
          .margin({ left: 16, right: 16, bottom: 12 })

          // Server Info
          Column() {
            Text('服务器信息')
              .fontSize(13)
              .fontColor(this.theme.colors.textSecondary)
              .margin({ top: 16, bottom: 8, left: 16, right: 16 })
              .width('100%')

            Row() {
              Text('🌐')
                .fontSize(20)
                .margin({ right: 12 })
              Text('服务器地址: ' + (this.serverAddress || '未设置'))
                .fontSize(15)
                .fontColor(this.theme.colors.text)
                .layoutWeight(1)
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor(this.theme.colors.border)

            Row() {
              Text('📦')
                .fontSize(20)
                .margin({ right: 12 })
              Text('服务器类型: ' + (this.serverType || '未知'))
                .fontSize(15)
                .fontColor(this.theme.colors.text)
                .layoutWeight(1)
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor(this.theme.colors.border)

            Row() {
              Text('👤')
                .fontSize(20)
                .margin({ right: 12 })
              Text('当前用户: ' + (this.username || '未登录'))
                .fontSize(15)
                .fontColor(this.theme.colors.text)
                .layoutWeight(1)
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor(this.theme.colors.border)
          }
          .width('100%')
          .backgroundColor(this.theme.colors.surface)
          .borderRadius(12)
          .margin({ left: 16, right: 16, bottom: 12 })

          // Actions
          Column() {
            Text('操作')
              .fontSize(13)
              .fontColor(this.theme.colors.textSecondary)
              .margin({ top: 16, bottom: 8, left: 16, right: 16 })
              .width('100%')

            Row() {
              Text('🔄')
                .fontSize(20)
                .margin({ right: 12 })
              Text('切换数据源')
                .fontSize(15)
                .fontColor(this.theme.colors.text)
                .layoutWeight(1)
              Text('→')
                .fontSize(16)
                .fontColor(this.theme.colors.textSecondary)
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor(this.theme.colors.border)
            .onClick(() => this.navigateToSourceManage())

            Row() {
              Text('🚪')
                .fontSize(20)
                .margin({ right: 12 })
              Text('退出登录')
                .fontSize(15)
                .fontColor(this.theme.colors.text)
                .layoutWeight(1)
              Text('→')
                .fontSize(16)
                .fontColor(this.theme.colors.textSecondary)
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor(this.theme.colors.border)
            .onClick(() => this.logout())
          }
          .width('100%')
          .backgroundColor(this.theme.colors.surface)
          .borderRadius(12)
          .margin({ left: 16, right: 16, bottom: 12 })

          // About
          Column() {
            Text('关于')
              .fontSize(13)
              .fontColor(this.theme.colors.textSecondary)
              .margin({ top: 16, bottom: 8, left: 16, right: 16 })
              .width('100%')

            Row() {
              Text('📱')
                .fontSize(20)
                .margin({ right: 12 })
              Text('版本: ' + this.version)
                .fontSize(15)
                .fontColor(this.theme.colors.text)
                .layoutWeight(1)
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor(this.theme.colors.border)

            Row() {
              Text('❓')
                .fontSize(20)
                .margin({ right: 12 })
              Text('AudioDock for HarmonyOS')
                .fontSize(15)
                .fontColor(this.theme.colors.text)
                .layoutWeight(1)
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor(this.theme.colors.border)
          }
          .width('100%')
          .backgroundColor(this.theme.colors.surface)
          .borderRadius(12)
          .margin({ left: 16, right: 16 })
        }
        .width('100%')
        .padding({ top: 8, bottom: 20 })
      }
      .width('100%')
      .layoutWeight(1)
      .scrollBar(BarState.Off)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.theme.colors.background)
  }
}
