import { common, Want } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { Logger } from 'audiodock_common';

export const SUPPORT_EMAIL = 'audiodock@audiodock.cn';

/**
 * 用系统默认邮件应用打开 mailto: 链接（等价于 mobile 端的 Linking.openURL）。
 * 收件人默认为产品客服邮箱 audiodock@audiodock.cn，可通过 subject 预填主题。
 */
export function openEmail(
  context: common.Context,
  email: string = SUPPORT_EMAIL,
  subject?: string,
): void {
  const params = subject ? `?subject=${encodeURIComponent(subject)}` : '';
  const want: Want = {
    action: 'ohos.want.action.viewData',
    uri: `mailto:${email}${params}`,
  };
  (context as common.UIAbilityContext).startAbility(want).catch((err: BusinessError) => {
    Logger.w('EmailUtils', `open mail failed: ${JSON.stringify(err)}`);
  });
}
