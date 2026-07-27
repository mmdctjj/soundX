import router from '@ohos.router';
import { kvStore } from 'features_storage';
import { authStore } from '../context/AuthStore';

@Entry
@Component
struct Index {
  async aboutToAppear(): Promise<void> {
    await authStore.loadFromStorage();
    setTimeout(() => {
      if (authStore.state_.user) {
        router.replaceUrl({ url: 'pages/MainPage' });
      } else if (authStore.state_.serverAddress) {
        router.replaceUrl({ url: 'pages/LoginPage' });
      } else {
        router.replaceUrl({ url: 'pages/SourceSelectPage' });
      }
    }, 0);
  }

  build() {
    Column() { Text('AudioDock').fontSize(28).fontWeight(700); }
      .width('100%').height('100%').justifyContent(FlexAlign.Center);
  }
}