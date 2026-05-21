import router from '@ohos.router';
import { storage } from '../utils/StorageManager';
import { httpClient } from '../utils/HttpClient';

@Entry
@Component
struct SettingsPage {
  @State serverAddress: string = '';
  @State serverType: string = '';
  @State username: string = '';
  @State version: string = '1.0.0';

  aboutToAppear() {
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const address = await storage.getItem('serverAddress');
      const type = await storage.getItem('sourceType');
      const userStr = await storage.getItem('currentUser');
      this.serverAddress = address || '';
      this.serverType = type || '';
      if (userStr) {
        const user = JSON.parse(userStr) as Record<string, Object>;
        this.username = String(user['username'] || '');
      }
    } catch (e) {
      console.error('Load settings failed:', e);
    }
  }

  goBack() {
    router.back();
  }

  navigateToSourceManage() {
    router.pushUrl({ url: 'pages/SourceManagePage' });
  }

  async logout() {
    try {
      const savedAddress = await storage.getItem('serverAddress');
      if (savedAddress) {
        await storage.removeItem('token_' + savedAddress);
      }
      await storage.removeItem('currentUser');
      await storage.removeItem('serverAddress');
      await storage.removeItem('sourceType');
      httpClient.setToken('');
      router.replaceUrl({ url: 'pages/SourceSelectPage' });
    } catch (e) {
      console.error('Logout error:', e);
    }
  }

  // @Builder
  // SettingItem(icon: string, label: string, action: () => void) {
  //   Row() {
  //     Text(icon)
  //       .fontSize(20)
  //       .margin({ right: 12 })
  //     Text(label)
  //       .fontSize(15)
  //       .fontColor('#2c3e50')
  //       .layoutWeight(1)
  //     Text('→')
  //       .fontSize(16)
  //       .fontColor('#95a5a6')
  //   }
  //   .width('100%')
  //   .padding({ top: 16, bottom: 16, left: 16, right: 16 })
  //   .borderWidth({ bottom: 1 })
  //   .borderColor('#f0f0f0')
  //   .onClick(action)
  // }

  build() {
    Column() {
      Row() {
        Button('←')
          .width(40)
          .height(40)
          .backgroundColor(Color.Transparent)
          .fontSize(24)
          .fontColor('#2c3e50')
          .onClick(() => this.goBack())

        Text('设置')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2c3e50')
          .layoutWeight(1)
          .textAlign(TextAlign.Center)
      }
      .width('100%')
      .padding({ left: 8, right: 8, top: 16, bottom: 8 })

      Scroll() {
        Column() {
          // Server Info
          Column() {
            Text('服务器信息')
              .fontSize(13)
              .fontColor('#95a5a6')
              .margin({ top: 16, bottom: 8, left: 16, right: 16 })
              .width('100%')

            Row() {
              Text('🌐')
                .fontSize(20)
                .margin({ right: 12 })
              Text('服务器地址: ' + (this.serverAddress || '未设置'))
                .fontSize(15)
                .fontColor('#2c3e50')
                .layoutWeight(1)
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor('#f0f0f0')

            Row() {
              Text('📦')
                .fontSize(20)
                .margin({ right: 12 })
              Text('服务器类型: ' + (this.serverType || '未知'))
                .fontSize(15)
                .fontColor('#2c3e50')
                .layoutWeight(1)
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor('#f0f0f0')

            Row() {
              Text('👤')
                .fontSize(20)
                .margin({ right: 12 })
              Text('当前用户: ' + (this.username || '未登录'))
                .fontSize(15)
                .fontColor('#2c3e50')
                .layoutWeight(1)
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor('#f0f0f0')
          }
          .width('100%')
          .backgroundColor('#ffffff')
          .borderRadius(12)
          .margin({ left: 16, right: 16, bottom: 12 })

          // Actions
          Column() {
            Text('操作')
              .fontSize(13)
              .fontColor('#95a5a6')
              .margin({ top: 16, bottom: 8, left: 16, right: 16 })
              .width('100%')

            Row() {
              Text('🔄')
                .fontSize(20)
                .margin({ right: 12 })
              Text('切换数据源')
                .fontSize(15)
                .fontColor('#2c3e50')
                .layoutWeight(1)
              Text('→')
                .fontSize(16)
                .fontColor('#95a5a6')
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor('#f0f0f0')
            .onClick(() => this.navigateToSourceManage())

            Row() {
              Text('🚪')
                .fontSize(20)
                .margin({ right: 12 })
              Text('退出登录')
                .fontSize(15)
                .fontColor('#2c3e50')
                .layoutWeight(1)
              Text('→')
                .fontSize(16)
                .fontColor('#95a5a6')
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor('#f0f0f0')
            .onClick(() => this.logout())
          }
          .width('100%')
          .backgroundColor('#ffffff')
          .borderRadius(12)
          .margin({ left: 16, right: 16, bottom: 12 })

          // About
          Column() {
            Text('关于')
              .fontSize(13)
              .fontColor('#95a5a6')
              .margin({ top: 16, bottom: 8, left: 16, right: 16 })
              .width('100%')

            Row() {
              Text('📱')
                .fontSize(20)
                .margin({ right: 12 })
              Text('版本: ' + this.version)
                .fontSize(15)
                .fontColor('#2c3e50')
                .layoutWeight(1)
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor('#f0f0f0')

            Row() {
              Text('❓')
                .fontSize(20)
                .margin({ right: 12 })
              Text('AudioDock for HarmonyOS')
                .fontSize(15)
                .fontColor('#2c3e50')
                .layoutWeight(1)
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 16, right: 16 })
            .borderWidth({ bottom: 1 })
            .borderColor('#f0f0f0')
          }
          .width('100%')
          .backgroundColor('#ffffff')
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
    .backgroundColor('#f5f5f5')
  }
}
