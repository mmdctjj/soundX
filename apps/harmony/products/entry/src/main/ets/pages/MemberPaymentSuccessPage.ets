import router from '@ohos.router';
import { buildTheme, type Theme, type ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { kvStore } from 'features_storage';
import { Logger } from 'audiodock_common';
import { plusApi, setPlusAuthToken } from 'features_network';

@Entry
@Component
struct MemberPaymentSuccessPage {
  @State refreshing: boolean = true;
  @State orderId: string = '';
  @State tradeNo: string = '';
  @State method: string = 'ALIPAY';
  @State paidAt: string = '';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @StorageProp('appLang') appLang: string = 'zh-CN';
  @State theme: Theme = buildTheme('light');

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    const params = router.getParams() as Record<string, string> | undefined;
    this.orderId = params?.['orderId'] ?? '';
    this.tradeNo = params?.['tradeNo'] ?? '';
    this.method = (params?.['method'] ?? 'ALIPAY').toUpperCase();
    const rawPaidAt = params?.['paidAt'] ?? '';
    if (rawPaidAt) {
      try {
        this.paidAt = new Date(rawPaidAt).toLocaleString();
      } catch {
        this.paidAt = rawPaidAt;
      }
    }
    this.refreshVipStatus();
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  async refreshVipStatus(): Promise<void> {
    this.refreshing = true;
    try {
      const userId = await kvStore.get('plus_user_id');
      const token = await kvStore.get('plus_token');
      if (token) setPlusAuthToken(token);
      if (userId) {
        await plusApi.getVipStatus(userId);
      }
    } catch (e) {
      Logger.w('PaymentSuccess', `refreshVipStatus failed: ${String(e)}`);
    } finally {
      this.refreshing = false;
    }
  }

  build() {
    Column() {
      // Header
      Row() {
        Text('‹').fontSize(28).fontColor(this.theme.colors.text)
          .onClick(() => router.back())
          .padding({ right: 10 })
        Text(t('memberSuccess.paymentSuccess'))
          .fontSize(18).fontWeight(FontWeight.Bold)
          .fontColor(this.theme.colors.text)
          .layoutWeight(1)
        Blank().width(36)
      }
      .width('100%').height(56)
      .padding({ left: 16, right: 16 })
      .alignItems(VerticalAlign.Center)

      // Success card
      Column() {
        Text('✓')
          .fontSize(56)
          .fontColor('#2ECC71')
          .margin({ bottom: 12 })

        Text(t('memberSuccess.paymentSuccess'))
          .fontSize(20).fontWeight(FontWeight.Bold)
          .fontColor(this.theme.colors.text)
          .margin({ bottom: 12 })

        // Payment date
        Column() {
          Text(t('memberSuccess.paymentDate'))
            .fontSize(12).fontColor(this.theme.colors.textSecondary)
            .margin({ bottom: 4 })
          Text(this.paidAt || '-')
            .fontSize(14).fontWeight(FontWeight.Medium)
            .fontColor(this.theme.colors.text)
        }
        .width('100%').alignItems(HorizontalAlign.Start)
        .margin({ top: 8 })

        // Transaction ID
        Column() {
          Text(this.method === 'WECHAT' ? t('memberSuccess.transactionId') : t('memberSuccess.transactionId'))
            .fontSize(12).fontColor(this.theme.colors.textSecondary)
            .margin({ bottom: 4 })
          Text(this.tradeNo || this.orderId || '-')
            .fontSize(14).fontWeight(FontWeight.Medium)
            .fontColor(this.theme.colors.text)
        }
        .width('100%').alignItems(HorizontalAlign.Start)
        .margin({ top: 8 })

        // Syncing indicator
        if (this.refreshing) {
          Row() {
            LoadingProgress().width(16).height(16).color(this.theme.colors.primary)
            Text(t('memberSuccess.syncingMemberStatus'))
              .fontSize(12).fontColor(this.theme.colors.textSecondary)
              .margin({ left: 8 })
          }
          .margin({ top: 10 })
        }

        // View member detail button
        Button(t('member.detail'))
          .width('100%').height(48)
          .borderRadius(12)
          .backgroundColor(this.theme.colors.primary)
          .fontColor(this.theme.colors.background)
          .fontSize(14).fontWeight(FontWeight.Medium)
          .margin({ top: 18 })
          .onClick(() => router.replaceUrl({ url: 'pages/MemberDetailPage' }))
      }
      .width('100%')
      .margin(20)
      .padding(24)
      .borderRadius(18)
      .border({ width: 1, color: this.theme.colors.border })
      .backgroundColor(this.theme.colors.card)
      .alignItems(HorizontalAlign.Center)
    }
    .width('100%').height('100%')
    .backgroundColor(this.theme.colors.background)
  }
}
