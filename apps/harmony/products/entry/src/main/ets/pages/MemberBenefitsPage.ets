import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { buildTheme, type Theme, type ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { kvStore } from 'features_storage';
import { Logger } from 'audiodock_common';
import { plusApi, setPlusAuthToken } from 'features_network';
import type { VipCurrentLowestPriceData, VipPlanPrice, CouponItem } from 'features_network';

class ComparisonRow {
  feature: string = '';
  free: boolean = false;
  member: boolean = true;
  constructor(feature: string, free: boolean) {
    this.feature = feature;
    this.free = free;
    this.member = true;
  }
}

@Entry
@Component
struct MemberBenefitsPage {
  @State loading: boolean = false;
  @State pricingLoading: boolean = true;
  @State pricing: VipCurrentLowestPriceData | null = null;
  @State selectedPlan: string = 'lifetime';
  @State memberPhone: string = '';
  @State coupons: CouponItem[] = [];
  @State selectedCouponCode: string = '';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @StorageProp('appLang') appLang: string = 'zh-CN';
  @State theme: Theme = buildTheme('light');

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    this.loadMemberPhone();
    this.loadPricing();
    this.loadCoupons();
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  private maskPhone(value: string): string {
    const normalized = value.replace(/\D/g, '');
    if (normalized.length < 7) return '';
    return `${normalized.substring(0, 3)}****${normalized.substring(normalized.length - 4)}`;
  }

  async loadMemberPhone(): Promise<void> {
    try {
      const userId = await kvStore.get('plus_user_id');
      if (!userId) return;
      const profile = await plusApi.getMe(userId);
      const phone = profile.phone || profile.mobile || '';
      this.memberPhone = this.maskPhone(phone);
    } catch (e) {
      Logger.w('MemberBenefits', `loadMemberPhone failed: ${String(e)}`);
    }
  }

  async loadPricing(): Promise<void> {
    this.pricingLoading = true;
    try {
      this.pricing = await plusApi.getVipCurrentLowestPrice();
    } catch (e) {
      Logger.w('MemberBenefits', `loadPricing failed: ${String(e)}`);
      this.pricing = null;
    } finally {
      this.pricingLoading = false;
    }
  }

  async loadCoupons(): Promise<void> {
    try {
      this.coupons = await plusApi.getMyCoupons();
    } catch (e) {
      Logger.w('MemberBenefits', `loadCoupons failed: ${String(e)}`);
    }
  }

  private formatPrice(price: number | undefined | null): string {
    if (price === undefined || price === null || isNaN(price)) return '--';
    return Number.isInteger(price) ? String(price) : price.toFixed(2);
  }

  private hasDiscount(plan: VipPlanPrice | undefined | null): boolean {
    return !!plan && plan.discountPercent > 0 && plan.originalPrice > plan.currentPrice;
  }

  private getSelectedPrice(): number | null {
    if (!this.pricing) return null;
    const plan = this.selectedPlan === 'annual' ? this.pricing.annual : this.pricing.lifetime;
    return plan?.currentPrice ?? null;
  }

  async handlePayment(): Promise<void> {
    const price = this.getSelectedPrice();
    if (price === null) {
      promptAction.showToast({ message: t('memberBenefitsPage.priceUnavailable') });
      return;
    }
    const userId = await kvStore.get('plus_user_id');
    if (!userId) {
      promptAction.showToast({ message: t('common.loginFirst') });
      router.pushUrl({ url: 'pages/MemberLoginPage' });
      return;
    }
    this.loading = true;
    try {
      const res = await plusApi.createPayment(
        userId, this.selectedPlan, 'ALIPAY', price,
        this.selectedCouponCode || undefined
      );
      if (res.paymentUrl) {
        // HM 端通过 web 收银台完成支付
        router.pushUrl({
          url: 'pages/MemberPaymentSuccessPage',
          params: { orderId: res.orderId, tradeNo: '', method: 'ALIPAY', paidAt: new Date().toISOString() }
        });
      } else {
        promptAction.showToast({ message: t('memberBenefitsPage.orderCreated') });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      promptAction.showToast({ message: msg || t('memberBenefitsPage.networkFailed') });
      Logger.e('MemberBenefits', `payment failed: ${msg}`);
    } finally {
      this.loading = false;
    }
  }

  async handleLogout(): Promise<void> {
    await kvStore.set('plus_token', '');
    await kvStore.set('plus_user_id', '');
    setPlusAuthToken(null);
    promptAction.showToast({ message: t('memberBenefitsPage.logoutSuccess') });
    router.replaceUrl({ url: 'pages/MemberLoginPage' });
  }

  private getComparisonData(): ComparisonRow[] {
    return [
      new ComparisonRow(t('memberBenefits.basicFeatures'), true),
      new ComparisonRow(t('memberBenefits.deviceRelay'), true),
      new ComparisonRow(t('memberBenefits.syncControl'), false),
      new ComparisonRow(t('memberBenefits.ttsGeneration'), false),
      new ComparisonRow(t('memberBenefits.desktopWidget'), false),
      new ComparisonRow(t('memberBenefits.tvVersionComingSoon'), false),
      new ComparisonRow(t('memberBenefits.carMode'), false),
      new ComparisonRow(t('memberBenefits.scanLogin'), false),
      new ComparisonRow(t('memberBenefits.voiceAssistant'), false),
    ];
  }

  build() {
    Column() {
      // Header
      Row() {
        Text('‹').fontSize(28).fontColor(this.theme.colors.text)
          .onClick(() => router.back())
          .padding({ right: 10 })
        Text(t('memberBenefitsPage.title'))
          .fontSize(18).fontWeight(FontWeight.Bold)
          .fontColor(this.theme.colors.text)
          .layoutWeight(1)
        if (this.memberPhone) {
          Text(this.memberPhone)
            .fontSize(12).fontColor(this.theme.colors.textSecondary)
        }
      }
      .width('100%').height(56)
      .padding({ left: 16, right: 16 })
      .alignItems(VerticalAlign.Center)

      Scroll() {
        Column() {
          // Activity banner
          if (this.pricing && this.pricing.name) {
            Row() {
              Text(`${this.pricing.name}`)
                .fontSize(13).fontWeight(FontWeight.Medium)
                .fontColor(this.theme.colors.primary)
            }
            .width('100%')
            .padding(12)
            .borderRadius(10)
            .backgroundColor(`${this.theme.colors.primary}15`)
            .margin({ bottom: 16 })
          }

          // Comparison table
          Column() {
            // Table header
            Row() {
              Text(t('memberBenefitsPage.feature'))
                .fontSize(12).fontWeight(FontWeight.Medium)
                .fontColor(this.theme.colors.textSecondary)
                .layoutWeight(2)
              Text(t('memberBenefitsPage.nonMember'))
                .fontSize(12).fontWeight(FontWeight.Medium)
                .fontColor(this.theme.colors.textSecondary)
                .layoutWeight(1).textAlign(TextAlign.Center)
              Text(t('memberBenefitsPage.member'))
                .fontSize(12).fontWeight(FontWeight.Medium)
                .fontColor(this.theme.colors.textSecondary)
                .layoutWeight(1).textAlign(TextAlign.Center)
            }
            .width('100%').padding({ left: 16, right: 16, top: 12, bottom: 12 })

            ForEach(this.getComparisonData(), (row: ComparisonRow, idx: number) => {
              Row() {
                Text(row.feature)
                  .fontSize(14).fontWeight(FontWeight.Medium)
                  .fontColor(this.theme.colors.text)
                  .layoutWeight(2)
                Column() {
                  Text(row.free ? '✓' : '✗')
                    .fontSize(16)
                    .fontColor(row.free ? this.theme.colors.primary : this.theme.colors.textSecondary)
                    .opacity(row.free ? 1 : 0.3)
                }
                .layoutWeight(1).alignItems(HorizontalAlign.Center)
                Column() {
                  Text('✓')
                    .fontSize(18)
                    .fontColor('#FFD700')
                }
                .layoutWeight(1).alignItems(HorizontalAlign.Center)
              }
              .width('100%').padding({ left: 16, right: 16, top: 12, bottom: 12 })
              .border({ width: { top: idx === 0 ? 0 : 0.5 }, color: this.theme.colors.border })
            }, (row: ComparisonRow, idx: number) => `cmp-${idx}`)
          }
          .width('100%')
          .borderRadius(16)
          .border({ width: 1, color: this.theme.colors.border })
          .backgroundColor(this.theme.colors.card)
          .margin({ bottom: 16 })

          // Pricing plans
          Text(t('memberBenefitsPage.planTitle'))
            .fontSize(16).fontWeight(FontWeight.Bold)
            .fontColor(this.theme.colors.text)
            .margin({ bottom: 12 })
            .alignSelf(ItemAlign.Start)

          Row({ space: 12 }) {
            // Annual card
            Column() {
              Text(t('memberBenefitsPage.yearCard'))
                .fontSize(14).fontWeight(FontWeight.Medium)
                .fontColor(this.selectedPlan === 'annual' ? this.theme.colors.primary : this.theme.colors.text)
              if (!this.pricingLoading && this.pricing?.annual) {
                Text(`¥${this.formatPrice(this.pricing.annual.currentPrice)}`)
                  .fontSize(22).fontWeight(FontWeight.Bold)
                  .fontColor(this.theme.colors.text)
                  .margin({ top: 6 })
                Text(t('memberBenefitsPage.perYear'))
                  .fontSize(11).fontColor(this.theme.colors.textSecondary)
                if (this.hasDiscount(this.pricing.annual)) {
                  Text(`${t('memberBenefitsPage.originalPrice')} ¥${this.formatPrice(this.pricing.annual.originalPrice)}`)
                    .fontSize(11).fontColor(this.theme.colors.textSecondary)
                    .decoration({ type: TextDecorationType.LineThrough })
                    .margin({ top: 4 })
                }
              } else {
                Text('--').fontSize(22).fontColor(this.theme.colors.textSecondary).margin({ top: 6 })
              }
            }
            .layoutWeight(1)
            .padding(16)
            .borderRadius(12)
            .border({ width: this.selectedPlan === 'annual' ? 2 : 1, color: this.selectedPlan === 'annual' ? this.theme.colors.primary : this.theme.colors.border })
            .backgroundColor(this.theme.colors.card)
            .alignItems(HorizontalAlign.Center)
            .onClick(() => { this.selectedPlan = 'annual'; })

            // Lifetime card
            Column() {
              Row() {
                Text(t('memberBenefitsPage.lifetimeCard'))
                  .fontSize(14).fontWeight(FontWeight.Medium)
                  .fontColor(this.selectedPlan === 'lifetime' ? this.theme.colors.primary : this.theme.colors.text)
                Text(t('memberBenefitsPage.recommended'))
                  .fontSize(10).fontColor('#FFFFFF')
                  .backgroundColor(this.theme.colors.primary)
                  .borderRadius(4)
                  .padding({ left: 4, right: 4, top: 2, bottom: 2 })
                  .margin({ left: 6 })
              }
              if (!this.pricingLoading && this.pricing?.lifetime) {
                Text(`¥${this.formatPrice(this.pricing.lifetime.currentPrice)}`)
                  .fontSize(22).fontWeight(FontWeight.Bold)
                  .fontColor(this.theme.colors.text)
                  .margin({ top: 6 })
                Text(t('memberBenefitsPage.perLifetime'))
                  .fontSize(11).fontColor(this.theme.colors.textSecondary)
                if (this.hasDiscount(this.pricing.lifetime)) {
                  Text(`${t('memberBenefitsPage.originalPrice')} ¥${this.formatPrice(this.pricing.lifetime.originalPrice)}`)
                    .fontSize(11).fontColor(this.theme.colors.textSecondary)
                    .decoration({ type: TextDecorationType.LineThrough })
                    .margin({ top: 4 })
                }
              } else {
                Text('--').fontSize(22).fontColor(this.theme.colors.textSecondary).margin({ top: 6 })
              }
            }
            .layoutWeight(1)
            .padding(16)
            .borderRadius(12)
            .border({ width: this.selectedPlan === 'lifetime' ? 2 : 1, color: this.selectedPlan === 'lifetime' ? this.theme.colors.primary : this.theme.colors.border })
            .backgroundColor(this.theme.colors.card)
            .alignItems(HorizontalAlign.Center)
            .onClick(() => { this.selectedPlan = 'lifetime'; })
          }
          .width('100%').margin({ bottom: 16 })

          // Coupon selection
          if (this.coupons.length > 0) {
            Row() {
              Text('优惠券')
                .fontSize(14).fontColor(this.theme.colors.text)
                .layoutWeight(1)
              Select(this.coupons.map((c: CouponItem) => {
                return { value: c.name || c.code } as SelectOption;
              }))
                .selected(this.selectedCouponCode ? this.coupons.findIndex((c: CouponItem) => c.code === this.selectedCouponCode) : -1)
                .value(this.selectedCouponCode ? (this.coupons.find((c: CouponItem) => c.code === this.selectedCouponCode)?.name || this.selectedCouponCode) : '不使用')
                .onSelect((idx: number) => {
                  if (idx >= 0 && idx < this.coupons.length) {
                    this.selectedCouponCode = this.coupons[idx].code;
                  }
                })
                .font({ size: 14 })
                .selectedOptionFont({ size: 14 })
                .optionFont({ size: 14 })
            }
            .width('100%').padding({ top: 8, bottom: 8 })
            .margin({ bottom: 16 })
          }

          // Payment method
          Text(t('memberBenefitsPage.paymentMethod'))
            .fontSize(16).fontWeight(FontWeight.Bold)
            .fontColor(this.theme.colors.text)
            .margin({ bottom: 12 })
            .alignSelf(ItemAlign.Start)

          // Alipay button (primary for HM)
          Button() {
            if (this.loading) {
              LoadingProgress().width(20).height(20).color('#FFFFFF')
            } else {
              Text(t('memberBenefitsPage.alipay'))
                .fontSize(16).fontWeight(FontWeight.Medium)
                .fontColor('#FFFFFF')
            }
          }
          .width('100%').height(50)
          .borderRadius(12)
          .backgroundColor('#1677FF')
          .margin({ bottom: 12 })
          .enabled(!this.loading)
          .onClick(() => this.handlePayment())

          // Refund note
          Text(t('memberBenefitsPage.noRefund'))
            .fontSize(12).fontColor(this.theme.colors.textSecondary)
            .textAlign(TextAlign.Center)
            .width('100%')
            .margin({ bottom: 24 })

          // Logout button
          Button() {
            Row() {
              Text(t('memberBenefitsPage.logoutAction'))
                .fontSize(16).fontWeight(FontWeight.Medium)
                .fontColor('#FF3B30')
            }
          }
          .width('100%').height(50)
          .borderRadius(12)
          .backgroundColor(Color.Transparent)
          .border({ width: 1, color: '#FF3B30' })
          .margin({ bottom: 40 })
          .onClick(() => this.handleLogout())
        }
        .width('100%')
        .padding({ left: 20, right: 20, top: 16 })
      }
      .width('100%').layoutWeight(1)
      .scrollBar(BarState.Off)
    }
    .width('100%').height('100%')
    .backgroundColor(this.theme.colors.background)
  }
}
