import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { t, getLang } from 'features_i18n';
import { Logger } from 'audiodock_common';
import { miApi } from 'features_network';
import type {
  MiAuthStatusResponse,
  MiKeyword,
  MiKeyword as MiKeywordType,
  MiConversation,
  MiCastRecord,
  MiPagedResponse,
  MiQRCodeResponse,
  MiKeywordPatch,
  MiPageQuery,
} from 'features_network';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';
import { AppIcon } from '../components/AppIcon';

// 小爱音箱管理页：登录状态 / 唤醒关键字 / 对话历史 / 投放历史。
// 对齐 mobile app/mi-speaker.tsx。

const PAGE_SIZE = 20;

@Entry
@Component
struct MiSpeakerPage {
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @State private langAtBuild: string = getLang();
  @State theme: Theme = buildTheme('light');

  @State activeTab: number = 0;

  // 登录
  @State loggedIn: boolean = false;
  @State authChecked: boolean = false;
  @State qrCodeUrl: string = '';
  @State qrPolling: boolean = false;
  private qrTimer: number = -1;

  // 唤醒关键字
  @State keywords: MiKeyword[] = [];
  @State keywordsLoading: boolean = true;
  @State newKeyword: string = '';
  @State addingKeyword: boolean = false;

  // 对话历史
  @State convItems: MiConversation[] = [];
  @State convTotal: number = 0;
  @State convPage: number = 1;
  @State convLoading: boolean = true;
  @State convLoadingMore: boolean = false;

  // 投放历史
  @State castItems: MiCastRecord[] = [];
  @State castTotal: number = 0;
  @State castPage: number = 1;
  @State castLoading: boolean = true;
  @State castLoadingMore: boolean = false;

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    this.checkAuth();
  }

  aboutToDisappear(): void {
    this.stopQrPolling();
  }

  onPageShow(): void {
    const cur = getLang();
    if (cur !== this.langAtBuild) this.langAtBuild = cur;
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  stopQrPolling(): void {
    if (this.qrTimer >= 0) {
      clearInterval(this.qrTimer);
      this.qrTimer = -1;
    }
    this.qrPolling = false;
  }

  async checkAuth(): Promise<void> {
    try {
      const res: MiAuthStatusResponse = await miApi.getAuthStatus();
      this.loggedIn = res.logged_in;
      if (res.logged_in) {
        this.stopQrPolling();
        this.loadKeywords();
        this.loadConversations(1, false);
        this.loadCasts(1, false);
      }
    } catch (e) {
      Logger.w('MiSpeaker', `checkAuth failed: ${String(e)}`);
    } finally {
      this.authChecked = true;
    }
  }

  async handleGetQRCode(): Promise<void> {
    this.stopQrPolling();
    try {
      const res: MiQRCodeResponse = await miApi.getQRCode();
      if (res.already_logged_in) {
        this.loggedIn = true;
        this.qrCodeUrl = '';
        promptAction.showToast({ message: t('miManage.loginSuccess') });
        this.loadKeywords();
        this.loadConversations(1, false);
        this.loadCasts(1, false);
        return;
      }
      if (res.qrcode_url && res.status_url) {
        this.qrCodeUrl = res.qrcode_url;
        this.qrPolling = true;
        const lpUrl = res.status_url;
        this.qrTimer = setInterval(() => {
          this.pollQr(lpUrl);
        }, 3000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      promptAction.showToast({ message: msg });
    }
  }

  async pollQr(lpUrl: string): Promise<void> {
    try {
      const res = await miApi.getQRCodeStatus(lpUrl);
      if (res.status === 'success') {
        this.stopQrPolling();
        this.loggedIn = true;
        this.qrCodeUrl = '';
        promptAction.showToast({ message: t('miManage.loginSuccess') });
        this.loadKeywords();
        this.loadConversations(1, false);
        this.loadCasts(1, false);
      } else if (res.status === 'expired' || res.status === 'error') {
        this.stopQrPolling();
        this.qrCodeUrl = '';
        promptAction.showToast({ message: t('miManage.qrCodeExpired') });
      }
    } catch (e) {
      Logger.w('MiSpeaker', `pollQr failed: ${String(e)}`);
    }
  }

  handleLogout(): void {
    promptAction.showDialog({
      title: t('miManage.logoutConfirm'),
      buttons: [
        { text: t('common.cancel'), color: this.theme.colors.textSecondary },
        { text: t('miManage.logout'), color: '#FF3B30' },
      ],
    }).then(async (res) => {
      if (res.index !== 1) return;
      try {
        await miApi.logout();
        this.loggedIn = false;
        this.keywords = [];
        this.convItems = [];
        this.castItems = [];
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        promptAction.showToast({ message: msg });
      }
    });
  }

  // ===== 唤醒关键字 =====

  async loadKeywords(): Promise<void> {
    try {
      const res = await miApi.getKeywords();
      this.keywords = res.keywords ?? [];
    } catch (e) {
      Logger.w('MiSpeaker', `loadKeywords failed: ${String(e)}`);
    } finally {
      this.keywordsLoading = false;
    }
  }

  async handleAddKeyword(): Promise<void> {
    const kw = this.newKeyword.trim();
    if (kw.length === 0) return;
    this.addingKeyword = true;
    try {
      await miApi.addKeyword(kw);
      this.newKeyword = '';
      await this.loadKeywords();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      promptAction.showToast({ message: msg });
    } finally {
      this.addingKeyword = false;
    }
  }

  async handleToggleKeyword(kw: MiKeywordType): Promise<void> {
    try {
      const patch: MiKeywordPatch = { enabled: !kw.enabled };
      await miApi.updateKeyword(kw.id, patch);
      await this.loadKeywords();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      promptAction.showToast({ message: msg });
    }
  }

  handleDeleteKeyword(kw: MiKeywordType): void {
    promptAction.showDialog({
      title: t('miManage.keywordDeleteConfirm', [['keyword', kw.keyword]]),
      buttons: [
        { text: t('common.cancel'), color: this.theme.colors.textSecondary },
        { text: t('common.delete'), color: '#FF3B30' },
      ],
    }).then(async (res) => {
      if (res.index !== 1) return;
      try {
        await miApi.deleteKeyword(kw.id);
        await this.loadKeywords();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        promptAction.showToast({ message: msg });
      }
    });
  }

  // ===== 历史记录 =====

  async loadConversations(page: number, append: boolean): Promise<void> {
    if (page > 1) this.convLoadingMore = true;
    try {
      const q: MiPageQuery = { page: page, size: PAGE_SIZE };
      const res: MiPagedResponse<MiConversation> = await miApi.getConversations(q);
      this.convTotal = res.total ?? 0;
      if (append) {
        const next: MiConversation[] = this.convItems.slice();
        const newItems: MiConversation[] = res.items ?? [];
        for (const item of newItems) next.push(item);
        this.convItems = next;
      } else {
        this.convItems = res.items ?? [];
      }
      this.convPage = page;
    } catch (e) {
      Logger.w('MiSpeaker', `loadConversations failed: ${String(e)}`);
    } finally {
      this.convLoading = false;
      this.convLoadingMore = false;
    }
  }

  async loadCasts(page: number, append: boolean): Promise<void> {
    if (page > 1) this.castLoadingMore = true;
    try {
      const q: MiPageQuery = { page: page, size: PAGE_SIZE };
      const res: MiPagedResponse<MiCastRecord> = await miApi.getCasts(q);
      this.castTotal = res.total ?? 0;
      if (append) {
        const next: MiCastRecord[] = this.castItems.slice();
        const newItems: MiCastRecord[] = res.items ?? [];
        for (const item of newItems) next.push(item);
        this.castItems = next;
      } else {
        this.castItems = res.items ?? [];
      }
      this.castPage = page;
    } catch (e) {
      Logger.w('MiSpeaker', `loadCasts failed: ${String(e)}`);
    } finally {
      this.castLoading = false;
      this.castLoadingMore = false;
    }
  }

  sourceLabel(source: string): string {
    if (source === 'play_by_url') return t('miManage.castSource_play_by_url');
    if (source === 'play_playlist') return t('miManage.castSource_play_playlist');
    if (source === 'voice') return t('miManage.castSource_voice');
    return source;
  }

  formatTime(ms: number): string {
    if (ms <= 0) return '-';
    const d = new Date(ms);
    const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ===== UI =====

  @Builder
  LoginTab() {
    Column() {
      if (!this.authChecked) {
        LoadingProgress().width(36).height(36).color(this.theme.colors.primary)
      } else if (this.loggedIn) {
        Text('✅ ' + t('miManage.loggedIn'))
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.theme.colors.text)
          .margin({ bottom: 16 })
        Button(t('miManage.logout'))
          .height(44)
          .padding({ left: 40, right: 40 })
          .borderRadius(12)
          .backgroundColor('#F5222D')
          .fontColor('#FFFFFF')
          .fontSize(15)
          .onClick((): void => this.handleLogout())
      } else if (this.qrCodeUrl.length > 0) {
        Text(t('miManage.notLoggedIn'))
          .fontSize(14)
          .fontColor(this.theme.colors.textSecondary)
        Image(this.qrCodeUrl)
          .width(200)
          .height(200)
          .borderRadius(8)
          .margin({ top: 16, bottom: 12 })
          .objectFit(ImageFit.Contain)
        Text(t('miManage.scanQRCode'))
          .fontSize(12)
          .fontColor(this.theme.colors.textSecondary)
      } else {
        Text(t('miManage.notLoggedIn'))
          .fontSize(14)
          .fontColor(this.theme.colors.textSecondary)
          .margin({ bottom: 8 })
        Button(t('miManage.getQRCode'))
          .height(44)
          .padding({ left: 40, right: 40 })
          .borderRadius(12)
          .backgroundColor(this.theme.colors.primary)
          .fontColor('#FFFFFF')
          .fontSize(15)
          .onClick((): void => {
            this.handleGetQRCode();
          })
      }
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .padding({ top: 40, bottom: 40 })
  }

  @Builder
  KeywordsTab() {
    Column() {
      Row() {
        TextInput({
          text: this.newKeyword,
          placeholder: t('miManage.keywordPlaceholder'),
        })
          .placeholderColor(this.theme.colors.textSecondary)
          .fontColor(this.theme.colors.text)
          .fontSize(15)
          .height(44)
          .borderRadius(10)
          .border({ width: 0.5, color: this.theme.colors.border })
          .backgroundColor(this.theme.colors.card)
          .padding({ left: 14, right: 14 })
          .layoutWeight(1)
          .onChange((v: string): void => {
            this.newKeyword = v;
          })
          .onSubmit((): void => {
            this.handleAddKeyword();
          })
        Button(this.addingKeyword ? t('common.loading') : t('miManage.keywordAdd'))
          .height(44)
          .padding({ left: 16, right: 16 })
          .borderRadius(10)
          .backgroundColor(this.theme.colors.primary)
          .fontColor('#FFFFFF')
          .fontSize(14)
          .margin({ left: 10 })
          .enabled(!this.addingKeyword)
          .onClick((): void => {
            this.handleAddKeyword();
          })
      }
      .width('100%')
      .margin({ bottom: 12 })

      if (this.keywordsLoading) {
        LoadingProgress().width(36).height(36).color(this.theme.colors.primary).margin({ top: 24 })
      } else if (this.keywords.length === 0) {
        Text(t('miManage.keywordEmpty'))
          .fontSize(14)
          .fontColor(this.theme.colors.textSecondary)
          .margin({ top: 40 })
          .width('100%')
          .textAlign(TextAlign.Center)
      } else {
        List({ space: 0 }) {
          ForEach(this.keywords, (kw: MiKeywordType) => {
            ListItem() {
              Row() {
                Text(kw.keyword)
                  .fontSize(15)
                  .fontWeight(kw.enabled ? FontWeight.Medium : FontWeight.Normal)
                  .fontColor(this.theme.colors.text)
                  .decoration({ type: kw.enabled ? TextDecorationType.None : TextDecorationType.LineThrough })
                  .opacity(kw.enabled ? 1 : 0.5)
                  .layoutWeight(1)
                Toggle({ type: ToggleType.Switch, isOn: kw.enabled })
                  .selectedColor(this.theme.colors.primary)
                  .onChange(() => {
                    this.handleToggleKeyword(kw);
                  })
                Button() {
                  Text(t('common.delete')).fontSize(12).fontColor('#F5222D')
                }
                .height(32)
                .backgroundColor(Color.Transparent)
                .margin({ left: 8 })
                .onClick((): void => this.handleDeleteKeyword(kw))
              }
              .width('100%')
              .padding({ top: 12, bottom: 12 })
              .alignItems(VerticalAlign.Center)
            }
          }, (kw: MiKeywordType): string => `${kw.id}`)
        }
        .width('100%')
        .layoutWeight(1)
      }
    }
    .width('100%')
    .height('100%')
    .alignItems(HorizontalAlign.Start)
    .padding({ left: 20, right: 20, top: 16 })
  }

  @Builder
  HistoryTab(kind: string) {
    Column() {
      if (kind === 'conversations') {
        if (this.convLoading) {
          LoadingProgress().width(36).height(36).color(this.theme.colors.primary).margin({ top: 24 })
        } else if (this.convItems.length === 0) {
          Text(t('miManage.historyEmpty'))
            .fontSize(14)
            .fontColor(this.theme.colors.textSecondary)
            .margin({ top: 40 })
            .width('100%')
            .textAlign(TextAlign.Center)
        } else {
          List({ space: 0 }) {
            ForEach(this.convItems, (item: MiConversation) => {
              ListItem() {
                Column() {
                  Text(this.formatTime(item.timestamp_ms) + (item.device_name ? ` · ${item.device_name}` : ''))
                    .fontSize(11)
                    .fontColor(this.theme.colors.textSecondary)
                    .width('100%')
                  Text(item.query)
                    .fontSize(15)
                    .fontWeight(FontWeight.Medium)
                    .fontColor(this.theme.colors.text)
                    .width('100%')
                    .margin({ top: 4 })
                  if (item.answer.length > 0) {
                    Text(item.answer)
                      .fontSize(13)
                      .fontColor(this.theme.colors.textSecondary)
                      .maxLines(2)
                      .textOverflow({ overflow: TextOverflow.Ellipsis })
                      .width('100%')
                      .margin({ top: 4 })
                  }
                }
                .width('100%')
                .alignItems(HorizontalAlign.Start)
                .padding({ top: 12, bottom: 12 })
              }
            }, (item: MiConversation): string => `${item.id}`)
            if (this.convItems.length < this.convTotal) {
              ListItem() {
                Text(this.convLoadingMore ? t('common.loading') : t('miManage.loadMore'))
                  .fontSize(14)
                  .fontColor(this.theme.colors.primary)
                  .width('100%')
                  .textAlign(TextAlign.Center)
                  .padding({ top: 14, bottom: 14 })
                  .onClick(() => {
                    this.loadConversations(this.convPage + 1, true);
                  })
              }
            } else {
              ListItem() {
                Text(t('miManage.noMore'))
                  .fontSize(12)
                  .fontColor(this.theme.colors.textSecondary)
                  .width('100%')
                  .textAlign(TextAlign.Center)
                  .padding({ top: 14, bottom: 14 })
              }
            }
          }
          .width('100%')
          .layoutWeight(1)
        }
      } else {
        if (this.castLoading) {
          LoadingProgress().width(36).height(36).color(this.theme.colors.primary).margin({ top: 24 })
        } else if (this.castItems.length === 0) {
          Text(t('miManage.historyEmpty'))
            .fontSize(14)
            .fontColor(this.theme.colors.textSecondary)
            .margin({ top: 40 })
            .width('100%')
            .textAlign(TextAlign.Center)
        } else {
          List({ space: 0 }) {
            ForEach(this.castItems, (item: MiCastRecord) => {
              ListItem() {
                Column() {
                  Row() {
                    Text(this.formatTime(item.created_at) + (item.device_name ? ` · ${item.device_name}` : ''))
                      .fontSize(11)
                      .fontColor(this.theme.colors.textSecondary)
                      .layoutWeight(1)
                    Text(this.sourceLabel(item.source))
                      .fontSize(11)
                      .fontColor(this.theme.colors.primary)
                  }
                  .width('100%')

                  Text(item.title.length > 0 ? item.title : '-')
                    .fontSize(15)
                    .fontWeight(FontWeight.Medium)
                    .fontColor(this.theme.colors.text)
                    .width('100%')
                    .margin({ top: 4 })
                }
                .width('100%')
                .alignItems(HorizontalAlign.Start)
                .padding({ top: 12, bottom: 12 })
              }
            }, (item: MiCastRecord): string => `${item.id}`)
            if (this.castItems.length < this.castTotal) {
              ListItem() {
                Text(this.castLoadingMore ? t('common.loading') : t('miManage.loadMore'))
                  .fontSize(14)
                  .fontColor(this.theme.colors.primary)
                  .width('100%')
                  .textAlign(TextAlign.Center)
                  .padding({ top: 14, bottom: 14 })
                  .onClick(() => {
                    this.loadCasts(this.castPage + 1, true);
                  })
              }
            } else {
              ListItem() {
                Text(t('miManage.noMore'))
                  .fontSize(12)
                  .fontColor(this.theme.colors.textSecondary)
                  .width('100%')
                  .textAlign(TextAlign.Center)
                  .padding({ top: 14, bottom: 14 })
              }
            }
          }
          .width('100%')
          .layoutWeight(1)
        }
      }
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  LocalizedContent() {
    Column() {
      // Header
      Row() {
        Button() {
          AppIcon({ name: 'chevron-back', iconSize: 24, color: this.theme.colors.text })
        }
        .width(40)
        .height(40)
        .backgroundColor(Color.Transparent)
        .onClick((): void => router.back())

        Text(t('miManage.title'))
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.theme.colors.text)
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Row().width(40).height(40)
      }
      .width('100%')
      .padding({ left: 15, right: 15, top: 16, bottom: 15 })

      // Tabs
      Tabs({ barPosition: BarPosition.Start }) {
        TabContent() {
          this.LoginTab()
        }
        .tabBar(t('miManage.tabLogin'))

        TabContent() {
          this.KeywordsTab()
        }
        .tabBar(t('miManage.tabKeywords'))

        TabContent() {
          this.HistoryTab('conversations')
        }
        .tabBar(t('miManage.tabConversations'))

        TabContent() {
          this.HistoryTab('casts')
        }
        .tabBar(t('miManage.tabCasts'))
      }
      .width('100%')
      .layoutWeight(1)
      .barMode(BarMode.Fixed)
      .barBackgroundColor(this.theme.colors.card)
      .divider({ strokeWidth: 0.5, color: this.theme.colors.border })
      .onChange((index: number): void => {
        this.activeTab = index;
        if (index === 1) this.loadKeywords();
        if (index === 2) this.loadConversations(1, false);
        if (index === 3) this.loadCasts(1, false);
      })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.theme.colors.background)
  }

  build() {
    if (this.langAtBuild === 'zh-CN') {
      this.LocalizedContent()
    } else {
      this.LocalizedContent()
    }
  }
}
