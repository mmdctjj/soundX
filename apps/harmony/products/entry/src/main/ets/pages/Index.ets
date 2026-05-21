import router from '@ohos.router';
import { storage } from '../utils/StorageManager';
import { httpClient } from '../utils/HttpClient';

@Entry
@Component
struct Index {
  @State isLoading: boolean = true;
  @State hasAuth: boolean = false;

  aboutToAppear() {
    this.checkAuthStatus();
  }

  async checkAuthStatus() {
    try {
      const savedAddress = await storage.getItem('serverAddress');
      const savedToken = savedAddress ? await storage.getItem('token_' + savedAddress) : null;

      if (savedAddress && savedToken) {
        httpClient.setBaseURL(savedAddress);
        httpClient.setToken(savedToken);
        this.hasAuth = true;
        // 已登录，跳转到主页面
        router.replaceUrl({ url: 'pages/MainPage' });
      } else {
        // 未登录，跳转到数据源选择页
        router.replaceUrl({ url: 'pages/SourceSelectPage' });
      }
    } catch (e) {
      console.error('Failed to check auth:', e);
      router.replaceUrl({ url: 'pages/SourceSelectPage' });
    }
  }

  build() {
    Column() {
      Text('AudioDock')
        .fontSize(32)
        .fontWeight(FontWeight.Bold)
        .fontColor('#007DFF')
        .margin({ bottom: 16 })

      Text('正在加载...')
        .fontSize(14)
        .fontColor('#95a5a6')

      LoadingProgress()
        .width(40)
        .height(40)
        .color('#007DFF')
        .margin({ top: 24 })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .backgroundColor('#ffffff')
  }
}