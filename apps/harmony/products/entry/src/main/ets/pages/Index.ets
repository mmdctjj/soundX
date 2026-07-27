import router from '@ohos.router';
import { kvStore } from 'features_storage';
import { authStore } from '../context/AuthStore';
import hilog from '@ohos.hilog';

const DOMAIN = 0xA001;
const TAG = 'IndexRoute';

@Entry
@Component
struct Index {
  async aboutToAppear(): Promise<void> {
    hilog.info(DOMAIN, TAG, '[1] aboutToAppear entered');
    try {
      await authStore.loadFromStorage();
      hilog.info(DOMAIN, TAG, `[2] loadFromStorage done user=${String(authStore.state_.user)} server=${authStore.state_.serverAddress}`);
    } catch (e) {
      hilog.error(DOMAIN, TAG, `[2] loadFromStorage THREW: ${String(e)}`);
    }
    setTimeout(() => {
      hilog.info(DOMAIN, TAG, '[3] setTimeout fired');
      let target = 'pages/SourceSelectPage';
      if (authStore.state_.user) target = 'pages/MainPage';
      else if (authStore.state_.serverAddress) target = 'pages/LoginPage';
      hilog.info(DOMAIN, TAG, `[4] navigating to ${target}`);
      router.replaceUrl({ url: target }).then(() => {
        hilog.info(DOMAIN, TAG, `[5] replaceUrl resolved for ${target}`);
      }).catch((e: Error) => {
        hilog.error(DOMAIN, TAG, `[5] replaceUrl REJECTED for ${target}: ${e.message}`);
      });
    }, 0);
  }

  build() {
    Column() { Text('AudioDock').fontSize(28).fontWeight(700); }
      .width('100%').height('100%').justifyContent(FlexAlign.Center);
  }
}