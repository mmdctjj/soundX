import { common, Want } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { Logger } from 'audiodock_common';

/**
 * 用系统默认浏览器打开外部链接（等价于 mobile 端的 Linking.openURL）。
 */
export function openInBrowser(context: common.Context, url: string): void {
  const want: Want = {
    action: 'ohos.want.action.viewData',
    uri: url,
  };
  (context as common.UIAbilityContext).startAbility(want).catch((err: BusinessError) => {
    Logger.w('BrowserUtils', `open url failed: ${JSON.stringify(err)}`);
  });
}
