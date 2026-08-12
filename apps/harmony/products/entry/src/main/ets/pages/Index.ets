import router from '@ohos.router';
import common from '@ohos.app.ability.common';
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
      // 防御性初始化：框架可能在 EntryAbility 的异步 initialize() 完成 kvStore.init
      // 之前就加载本页，导致读取命中空的内存兜底、每次重启都误入数据源选择页。
      await kvStore.init(getContext(this) as common.UIAbilityContext);
    } catch (e) {
      hilog.warn(DOMAIN, TAG, `[1.5] kvStore.init: ${String(e)}`);
    }
    try {
      await authStore.loadFromStorage();
      hilog.info(DOMAIN, TAG, `[2] loadFromStorage done user=${String(authStore.state_.user)} server=${authStore.state_.serverAddress} token=${authStore.state_.token ? 'yes' : 'no'}`);
    } catch (e) {
      hilog.error(DOMAIN, TAG, `[2] loadFromStorage THREW: ${String(e)}`);
    }
    setTimeout(() => {
      hilog.info(DOMAIN, TAG, '[3] setTimeout fired');
      let target = 'pages/SourceSelectPage';
      if (authStore.state_.token && authStore.state_.serverAddress) target = 'pages/MainPage';
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