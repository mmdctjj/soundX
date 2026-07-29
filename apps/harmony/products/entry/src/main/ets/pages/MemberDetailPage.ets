import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { buildTheme, type Theme, type ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { kvStore } from 'features_storage';
import { Logger } from 'audiodock_common';
import { plusApi, setPlusAuthToken } from 'features_network';
import type { PlusUserProfile } from 'features_network';

class ComparisonRow {
  feature: string = '';
  free: boolean = false;
  constructor(feature: string, free: boolean) {
    this.feature = feature;
    this.free = free;
  }
}

@Entry
@Component
struct MemberDetailPage {
  @State loading: boolean = true;
  @State vipData: PlusUserProfile | null = null;
  @State memberPhone: string = '';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @StorageProp('appLang') appLang: string = 'zh-CN';
  @State theme: Theme = buildTheme('light');

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    this.fetchVipStatus();
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  private maskPhone(value: string): string {
    const normalized = value.replace(/\D/g, '');
    if (normalized.length < 7) return '';
    return `${normalized.substring(0, 3)}****${normalized.substring(normalized.length - 4)}`;
  }

  async fetchVipStatus(): Promise<void> {
    this.loading = true;
    try {
      const userId = await kvStore.get('plus_user_id');
      const token = await kvStore.get('plus_token');
      if (token) setPlusAuthToken(token);
      if (userId) {
        const profile = await plusApi.getMe(userId);
        this.vipData = profile;
        this.memberPhone = this.maskPhone(profile.phone || profile.mobile || '');
      }
    } catch (e) {
      Logger.e('MemberDetail', `fetchVipStatus failed: ${String(e)}`);
    } finally {
      this.loading = false;
    }
  }

  private isVip(): boolean {
    return !!this.vipData && !!this.vipData.vipTier && this.vipData.vipTier !== 'NONE';
  }

  private getTierName(): string {
    if (!this.vipData) return '';
    return this.vipData.vipTier === 'LIFETIME' ? t('memberDetailPage.lifetime') : t('memberDetailPage.annual');
  }

  private getExpiryDate(): string {
    if (!this.vipData) return '';
    if (this.vipData.vipTier === 'LIFETIME') return t('memberDetailPage.lifetimeValid');
    if (this.vipData.vipExpiresAt) {
      try {
        return new Date(this.vipData.vipExpiresAt).toLocaleDateString();
      } catch {
        return this.vipData.vipExpiresAt;
      }
    }
    return t('memberDetailPage.unknown');
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
        Text(t('memberDetailPage.title'))
          .fontSize(20).fontWeight(FontWeight.Bold)
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

      if (this.loading) {
        Column() {
          LoadingProgress().width(48).height(48).color(this.theme.colors.primary)
        }
        .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else {
        Scroll() {
          Column() {
            // VIP status card
            Column() {
              Column() {
                Text('♛')
                  .fontSize(56)
                  .fontColor(this.isVip() ? '#FFD700' : this.theme.colors.textSecondary)
                Text(this.isVip() ? t('memberDetailPage.activated') : t('memberDetailPage.notActivated'))
                  .fontSize(20).fontWeight(FontWeight.Bold)
                  .fontColor(this.theme.colors.text)
                  .margin({ top: 16 })
              }
              .width('100%').alignItems(HorizontalAlign.Center)
              .margin({ bottom: 24 })

              if (this.isVip()) {
                Column() {
                  Row() {
                    Text(t('memberDetailPage.tier'))
                      .fontSize(15).fontColor(this.theme.colors.textSecondary)
                    Blank()
                    Text(this.getTierName())
                      .fontSize(16).fontWeight(FontWeight.Medium)
                      .fontColor(this.theme.colors.text)
                  }
                  .width('100%')

                  Row() {
                    Text(t('memberDetailPage.expiry'))
                      .fontSize(15).fontColor(this.theme.colors.textSecondary)
                    Blank()
                    Text(this.getExpiryDate())
                      .fontSize(16).fontWeight(FontWeight.Medium)
                      .fontColor(this.theme.colors.text)
                  }
                  .width('100%').margin({ top: 16 })
                }
                .width('100%')
                .padding({ top: 24 })
                .border({ width: { top: 0.5 }, color: this.theme.colors.border })
              } else {
                Button(t('memberDetailPage.benefits'))
                  .width('100%').height(50)
                  .borderRadius(12)
                  .backgroundColor(this.theme.colors.primary)
                  .fontColor('#FFFFFF')
                  .fontSize(16).fontWeight(FontWeight.Medium)
                  .margin({ top: 20 })
                  .onClick(() => router.pushUrl({ url: 'pages/MemberBenefitsPage' }))
              }
            }
            .width('100%')
            .padding(24)
            .borderRadius(20)
            .border({ width: 1, color: this.theme.colors.border })
            .backgroundColor(this.theme.colors.card)
            .margin({ bottom: 10 })

            // Comparison table
            Column() {
              Row() {
                Text(t('memberDetailPage.feature'))
                  .fontSize(12).fontWeight(FontWeight.Medium)
                  .fontColor(this.theme.colors.textSecondary)
                  .layoutWeight(2)
                Text(t('memberDetailPage.nonMember'))
                  .fontSize(12).fontWeight(FontWeight.Medium)
                  .fontColor(this.theme.colors.textSecondary)
                  .layoutWeight(1).textAlign(TextAlign.Center)
                Text(t('memberDetailPage.member'))
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
            .margin({ bottom: 10 })

            // Logout button
            Button() {
              Row() {
                Text(t('memberDetailPage.logoutAction'))
                  .fontSize(16).fontWeight(FontWeight.Medium)
                  .fontColor('#FFFFFF')
              }
            }
            .width('100%').height(50)
            .borderRadius(12)
            .backgroundColor('#FF3B30')
            .margin({ bottom: 40 })
            .onClick(() => this.handleLogout())
          }
          .width('100%')
          .padding({ left: 20, right: 20, top: 16 })
        }
        .width('100%').layoutWeight(1)
        .scrollBar(BarState.Off)
      }
    }
    .width('100%').height('100%')
    .backgroundColor(this.theme.colors.background)
  }
}
