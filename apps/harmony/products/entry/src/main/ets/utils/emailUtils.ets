import { common, Want } from '@kit.AbilityKit';
import { BusinessError, pasteboard } from '@kit.BasicServicesKit';
import promptAction from '@ohos.promptAction';
import { Logger } from 'audiodock_common';

export const SUPPORT_EMAIL = 'audiodock@audiodock.cn';

const REDIRECT_DELAY_MS = 2000;

/**
 * 拼接 mailto: URI，遵守 RFC 6068：mailto:to@example.com?subject=...&body=...。
 * 收件人同时写在 `mailto:` 之后和 `to=` 参数，兼容主流邮件客户端的解析习惯。
 */
function buildMailtoUri(email: string, subject?: string, body?: string): string {
  const parts: string[] = [`to=${encodeURIComponent(email)}`];
  if (subject && subject.length > 0) {
    parts.push(`subject=${encodeURIComponent(subject)}`);
  }
  if (body && body.length > 0) {
    parts.push(`body=${encodeURIComponent(body)}`);
  }
  return `mailto:${email}?${parts.join('&')}`;
}

/**
 * 把收件人邮箱写入系统剪贴板。即使邮件 app 没把收件人填进去，
 * 用户也能在邮件 app 里直接粘贴（鸿蒙端点地址栏长按/粘贴即可）。
 */
async function copyEmailToClipboard(email: string): Promise<boolean> {
  try {
    const data = pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, email);
    await pasteboard.getSystemPasteboard().setData(data);
    return true;
  } catch (e) {
    Logger.w('EmailUtils', `copy to clipboard failed: ${String(e)}`);
    return false;
  }
}

/**
 * 用系统默认邮件应用打开 mailto: 链接（等价于 mobile 端的 Linking.openURL）。
 * 收件人默认为产品客服邮箱 audiodock@audiodock.cn，可通过 subject / body 预填主题与正文。
 *
 * 行为：
 * 1. 复制邮箱地址到系统剪贴板
 * 2. 弹 Toast 提示「已复制到剪贴板」
 * 3. 等待 2 秒（让用户看清 Toast + 准备切换到邮件 app）
 * 4. 优先用 API 12+ 的 context.openLink，按 mailto: scheme 路由到任何声明了
 *    mailto handler 的应用（系统邮件、网易、QQ 邮箱等）
 * 5. openLink 失败时 fallback 到 startAbility + viewData + type: 'mailto'
 *
 * 调用方无需 await，函数内部 fire-and-forget。toastMessage 接受 caller 传入
 * 的 i18n 翻译字符串（默认空串时不弹 Toast）。
 */
export function openEmail(
  context: common.UIAbilityContext,
  email: string = SUPPORT_EMAIL,
  subject?: string,
  body?: string,
  toastMessage: string = '',
): void {
  void (async (): Promise<void> => {
    // 1. 复制邮箱到剪贴板
    const ok = await copyEmailToClipboard(email);
    // 2. 弹 Toast 提示（仅在复制成功时）
    if (ok && toastMessage.length > 0) {
      promptAction.showToast({ message: toastMessage, duration: 1500 });
    }
    // 3. 等待 2 秒后跳转
    setTimeout(() => {
      const uri = buildMailtoUri(email, subject, body);
      context.openLink(uri)
        .catch((err: BusinessError) => {
          Logger.w('EmailUtils', `openLink failed: ${JSON.stringify(err)}, fallback startAbility`);
          fallbackStartAbility(context, uri);
        });
    }, REDIRECT_DELAY_MS);
  })();
}

function fallbackStartAbility(context: common.UIAbilityContext, uri: string): void {
  const want: Want = {
    action: 'ohos.want.action.viewData',
    uri,
    type: 'mailto',
  };
  context.startAbility(want).catch((err: BusinessError) => {
    Logger.w('EmailUtils', `open mail failed: ${JSON.stringify(err)}`);
  });
}
