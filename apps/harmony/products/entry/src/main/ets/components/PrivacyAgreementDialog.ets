import { buildTheme } from 'features_ui';
import type { Theme } from 'features_ui';
import { openInBrowser } from '../utils/browserUtils';

const USER_AGREEMENT_URL = 'https://www.audiodock.cn/docs/user-agreement/';
const PRIVACY_POLICY_URL = 'https://www.audiodock.cn/docs/privacy-policy/';
const LINK_COLOR = '#1677ff';

/**
 * 首次启动隐私协议弹窗，1:1 对齐 mobile src/components/PrivacyAgreementDialog.tsx：
 * 首次进入 App 且未同意过协议时展示；点击"同意并继续"记录同意标记并关闭弹窗；
 * 点击"不同意"直接退出 App。合规文案与 mobile 保持一致（仅中文，不走 i18n）。
 */
@Component
export struct PrivacyAgreementDialog {
  @Prop theme: Theme = buildTheme('light');
  onAgree: () => void = () => {};
  onDisagree: () => void = () => {};

  build() {
    Column() {
      Text('欢迎使用 声仓')
        .fontSize(18)
        .fontWeight(700)
        .fontColor(this.theme.colors.text)
        .textAlign(TextAlign.Center)
        .width('100%')
        .margin({ bottom: 16 });

      Column() {
        Text('欢迎使用声仓！')
          .fontSize(14).lineHeight(22).margin({ bottom: 6 })
          .fontColor(this.theme.colors.text);
        Text('为了保障您的个人信息安全，请您阅读并同意：')
          .fontSize(14).lineHeight(22).margin({ bottom: 6 })
          .fontColor(this.theme.colors.text);
        Row() {
          Text('《用户协议》')
            .fontSize(14).lineHeight(22)
            .fontColor(LINK_COLOR)
            .decoration({ type: TextDecorationType.Underline })
            .margin({ right: 16 })
            .onClick(() => openInBrowser(getContext(this), USER_AGREEMENT_URL));
          Text('《隐私政策》')
            .fontSize(14).lineHeight(22)
            .fontColor(LINK_COLOR)
            .decoration({ type: TextDecorationType.Underline })
            .onClick(() => openInBrowser(getContext(this), PRIVACY_POLICY_URL));
        }
        .margin({ bottom: 2 });
        Text('我们将按照《隐私政策》收集和使用必要的信息，用于提供音频播放、账号登录、同步等服务。')
          .fontSize(14).lineHeight(22).margin({ bottom: 6 })
          .fontColor(this.theme.colors.textSecondary);
        Text('如果您点击"同意并继续"，即表示您已阅读并同意上述协议。')
          .fontSize(14).lineHeight(22).margin({ bottom: 6 })
          .fontColor(this.theme.colors.textSecondary);
      }
      .alignItems(HorizontalAlign.Start)
      .margin({ bottom: 20 });

      Column() {
        Text('同意并继续')
          .fontSize(16)
          .fontWeight(600)
          .fontColor(this.theme.colors.background);
      }
      .width('100%')
      .height(46)
      .borderRadius(23)
      .backgroundColor(this.theme.colors.primary)
      .justifyContent(FlexAlign.Center)
      .margin({ bottom: 10 })
      .onClick(() => this.onAgree());

      Column() {
        Text('不同意')
          .fontSize(16)
          .fontColor(this.theme.colors.textSecondary);
      }
      .width('100%')
      .height(46)
      .borderRadius(23)
      .borderWidth(0.5)
      .borderColor(this.theme.colors.border)
      .justifyContent(FlexAlign.Center)
      .onClick(() => this.onDisagree());
    }
    .width('100%')
    .constraintSize({ maxWidth: 400 })
    .borderRadius(16)
    .padding({ left: 24, right: 24, top: 24, bottom: 16 })
    .backgroundColor(this.theme.colors.card);
  }
}
