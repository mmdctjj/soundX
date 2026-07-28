import router from '@ohos.router';
import { kvStore } from 'features_storage';
import { Logger } from 'audiodock_common';
import { authStore } from '../context/AuthStore';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { getInternalQuality, getExternalQuality } from '../services/trackQuality';

@Entry
@Component
struct SettingsPage {
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  private theme: Theme = buildTheme('light');

  // General settings state
  @State autoTheme: boolean = false;
  @State autoOrientation: boolean = false;
  @State voiceAssistantEnabled: boolean = false;
  @State carModeEnabled: boolean = false;
  @State acceptRelay: boolean = false;
  @State acceptSync: boolean = false;
  @State cacheEnabled: boolean = false;
  @State audiobookMode: boolean = false;
  @State experienceProgramEnabled: boolean = false;
  @State recommendationLikeRatio: number = 50;
  @State internalQuality: string = '';
  @State externalQuality: string = '';
  @State sourceType: string = '';
  @State version: string = '1.0.0';

  aboutToAppear() {
    this.theme = buildTheme(this.themeMode);
    this.loadSettings();
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  async loadSettings() {
    try {
      this.sourceType = authStore.state_.sourceType;
      this.autoTheme = (await kvStore.get('autoTheme')) === 'true';
      this.autoOrientation = (await kvStore.get('autoOrientation')) === 'true';
      this.voiceAssistantEnabled = (await kvStore.get('voiceAssistantEnabled')) === 'true';
      this.carModeEnabled = (await kvStore.get('carModeEnabled')) === 'true';
      this.acceptRelay = (await kvStore.get('acceptRelay')) === 'true';
      this.acceptSync = (await kvStore.get('acceptSync')) === 'true';
      this.cacheEnabled = (await kvStore.get('cacheEnabled')) === 'true';
      this.experienceProgramEnabled = (await kvStore.get('experienceProgramEnabled')) === 'true';
      this.audiobookMode = (await kvStore.get('playMode')) === 'AUDIOBOOK';
      const ratioRaw = await kvStore.get('recommendationLikeRatio');
      this.recommendationLikeRatio = ratioRaw ? Number(ratioRaw) : 50;
      this.internalQuality = await getInternalQuality();
      this.externalQuality = await getExternalQuality();
    } catch (e) {
      Logger.w('SettingsPage', `load settings failed: ${String(e)}`);
    }
  }

  goBack() {
    router.back();
  }

  async updateBoolSetting(key: string, value: boolean) {
    await kvStore.set(key, value ? 'true' : 'false');
  }

  setThemeMode(mode: ThemeMode): void {
    AppStorage.setOrCreate('themeMode', mode);
    kvStore.set('themeMode', mode);
  }

  handleAutoThemeChange(val: boolean) {
    this.autoTheme = val;
    this.updateBoolSetting('autoTheme', val);
  }

  handleDarkModeChange(val: boolean) {
    if (this.autoTheme) return;
    this.setThemeMode(val ? 'dark' : 'light');
  }

  handleFestiveChange(val: boolean) {
    if (this.autoTheme) return;
    this.setThemeMode(val ? 'festive' : 'light');
  }

  handleAutoOrientationChange(val: boolean) {
    this.autoOrientation = val;
    this.updateBoolSetting('autoOrientation', val);
  }

  handleVoiceAssistantChange(val: boolean) {
    this.voiceAssistantEnabled = val;
    this.updateBoolSetting('voiceAssistantEnabled', val);
  }

  handleCarModeChange(val: boolean) {
    this.carModeEnabled = val;
    this.updateBoolSetting('carModeEnabled', val);
  }

  handleRelayChange(val: boolean) {
    this.acceptRelay = val;
    this.updateBoolSetting('acceptRelay', val);
  }

  handleSyncChange(val: boolean) {
    this.acceptSync = val;
    this.updateBoolSetting('acceptSync', val);
  }

  handleCacheChange(val: boolean) {
    this.cacheEnabled = val;
    this.updateBoolSetting('cacheEnabled', val);
  }

  handleAudiobookModeChange(val: boolean) {
    this.audiobookMode = val;
    kvStore.set('playMode', val ? 'AUDIOBOOK' : 'MUSIC');
  }

  handleRatioChange(value: number) {
    this.recommendationLikeRatio = Math.round(value / 5) * 5;
    kvStore.set('recommendationLikeRatio', String(this.recommendationLikeRatio));
  }

  getQualityLabel(quality: string): string {
    if (quality === 'lossless') return t('settings.playbackQualityLossless');
    if (quality === 'high') return t('settings.playbackQualityHigh');
    return t('settings.playbackQualityLow');
  }

  async logout() {
    try {
      await authStore.logout();
      await kvStore.delete('serverAddress');
      await kvStore.delete('selectedSourceType');
      router.replaceUrl({ url: 'pages/SourceSelectPage' });
    } catch (e) {
      Logger.e('SettingsPage', `logout failed: ${String(e)}`);
    }
  }

  @Builder
  SectionTitle(title: string) {
    Text(title)
      .fontSize(14)
      .fontWeight(FontWeight.Bold)
      .fontColor(this.theme.colors.primary)
      .opacity(0.6)
      .margin({ top: 30, bottom: 10 })
      .width('100%')
  }

  @Builder
  SwitchRow(label: string, description: string, value: boolean, onChange: (val: boolean) => void, disabled: boolean = false) {
    Row() {
      Column() {
        Text(label)
          .fontSize(17)
          .fontWeight(FontWeight.Medium)
          .fontColor(this.theme.colors.text)
          .margin({ bottom: 4 })
        Text(description)
          .fontSize(13)
          .fontColor(this.theme.colors.textSecondary)
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .margin({ right: 20 })

      Toggle({ type: ToggleType.Switch, isOn: value })
        .selectedColor(this.theme.colors.primary)
        .switchPointColor('#f4f3f4')
        .enabled(!disabled)
        .opacity(disabled ? 0.5 : 1)
        .onChange((isOn: boolean) => onChange(isOn))
    }
    .width('100%')
    .padding({ top: 15, bottom: 15 })
    .borderWidth({ bottom: 0.5 })
    .borderColor(this.theme.colors.border)
  }

  @Builder
  ActionRow(label: string, description: string, onPress: () => void, valueText: string = '') {
    Row() {
      Column() {
        Text(label)
          .fontSize(17)
          .fontWeight(FontWeight.Medium)
          .fontColor(this.theme.colors.text)
          .margin({ bottom: 4 })
        Text(description)
          .fontSize(13)
          .fontColor(this.theme.colors.textSecondary)
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .margin({ right: 20 })

      Row() {
        if (valueText.length > 0) {
          Text(valueText)
            .fontSize(14)
            .fontWeight(FontWeight.Medium)
            .fontColor(this.theme.colors.textSecondary)
            .margin({ right: 6 })
        }
        Text('›')
          .fontSize(20)
          .fontColor(this.theme.colors.textSecondary)
      }
    }
    .width('100%')
    .padding({ top: 15, bottom: 15 })
    .borderWidth({ bottom: 0.5 })
    .borderColor(this.theme.colors.border)
    .onClick(onPress)
  }

  build() {
    Column() {
      // Header
      Row() {
        Button() {
          Text('‹')
            .fontSize(28)
            .fontColor(this.theme.colors.text)
        }
        .width(40)
        .height(40)
        .backgroundColor(Color.Transparent)
        .onClick(() => this.goBack())

        Text(t('settings.title'))
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.theme.colors.text)
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Row().width(40).height(40)
      }
      .width('100%')
      .padding({ left: 15, right: 15, top: 16, bottom: 15 })

      Scroll() {
        Column() {
          // ═══ 服务器 Section ═══
          this.SectionTitle(t('settings.server'))

          this.ActionRow(
            t('settings.sourceManage'),
            t('settings.sourceManageDescription'),
            () => router.pushUrl({ url: 'pages/SourceManagePage' }),
          )

          // ═══ 通用 Section ═══
          this.SectionTitle(t('settings.general'))

          // 语言
          this.ActionRow(
            t('settings.language'),
            t('settings.languageDescription'),
            () => router.pushUrl({ url: 'pages/LanguagePage' }),
          )

          // 内网播放品质
          this.ActionRow(
            t('settings.internalPlaybackQuality'),
            t('settings.internalPlaybackQualityDescription'),
            () => router.pushUrl({ url: 'pages/PlaybackQualityPage', params: { network: 'internal' } }),
            this.getQualityLabel(this.internalQuality),
          )

          // 外网播放品质
          this.ActionRow(
            t('settings.externalPlaybackQuality'),
            t('settings.externalPlaybackQualityDescription'),
            () => router.pushUrl({ url: 'pages/PlaybackQualityPage', params: { network: 'external' } }),
            this.getQualityLabel(this.externalQuality),
          )

          // 车机模式
          this.SwitchRow(
            t('settings.carMode'),
            t('settings.carModeDescription'),
            this.carModeEnabled,
            (val: boolean) => this.handleCarModeChange(val),
          )

          // 跟随系统主题
          this.SwitchRow(
            t('settings.autoTheme'),
            t('settings.autoThemeDescription'),
            this.autoTheme,
            (val: boolean) => this.handleAutoThemeChange(val),
          )

          // 深色模式
          Column() {
            this.SwitchRow(
              t('settings.darkMode'),
              t('settings.darkModeDescription'),
              this.themeMode === 'dark',
              (val: boolean) => this.handleDarkModeChange(val),
              this.autoTheme,
            )

            // 春日主题
            this.SwitchRow(
              t('settings.festiveTheme'),
              t('settings.festiveThemeDescription'),
              this.themeMode === 'festive',
              (val: boolean) => this.handleFestiveChange(val),
              this.autoTheme,
            )
          }
          .opacity(this.autoTheme ? 0.5 : 1)

          // 自动横竖屏
          this.SwitchRow(
            t('settings.autoOrientation'),
            t('settings.autoOrientationDescription'),
            this.autoOrientation,
            (val: boolean) => this.handleAutoOrientationChange(val),
          )

          // 语音助手
          this.SwitchRow(
            t('settings.voiceAssistant'),
            t('settings.voiceAssistantDescription'),
            this.voiceAssistantEnabled,
            (val: boolean) => this.handleVoiceAssistantChange(val),
          )

          // 推荐偏好
          Column() {
            Text(t('settings.recommendationPreference'))
              .fontSize(17)
              .fontWeight(FontWeight.Medium)
              .fontColor(this.theme.colors.text)
              .margin({ bottom: 4 })
            Text(`${t('settings.like')} ${this.recommendationLikeRatio}% · ${t('settings.fresh')} ${100 - this.recommendationLikeRatio}%`)
              .fontSize(13)
              .fontColor(this.theme.colors.textSecondary)
            Slider({
              value: this.recommendationLikeRatio,
              min: 0,
              max: 100,
              step: 5,
            })
              .selectedColor(this.theme.colors.primary)
              .trackColor(this.theme.colors.border)
              .blockColor(this.theme.colors.primary)
              .width('100%')
              .height(28)
              .margin({ top: 8 })
              .onChange((value: number) => this.handleRatioChange(value))
          }
          .width('100%')
          .alignItems(HorizontalAlign.Start)
          .padding({ top: 15, bottom: 15 })
          .borderWidth({ bottom: 0.5 })
          .borderColor(this.theme.colors.border)

          // 有声书模式 (仅非 Subsonic 源显示)
          if (this.sourceType !== 'Subsonic') {
            this.SwitchRow(
              t('settings.audiobookMode'),
              t('settings.audiobookModeDescription'),
              this.audiobookMode,
              (val: boolean) => this.handleAudiobookModeChange(val),
            )
          }

          // 接力播放
          this.SwitchRow(
            t('settings.relayPlay'),
            t('settings.relayPlayDescription'),
            this.acceptRelay,
            (val: boolean) => this.handleRelayChange(val),
          )

          // 同步控制
          this.SwitchRow(
            t('settings.syncControl'),
            t('settings.syncControlDescription'),
            this.acceptSync,
            (val: boolean) => this.handleSyncChange(val),
          )

          // 边听边存
          this.SwitchRow(
            t('settings.cacheWhilePlaying'),
            t('settings.cacheWhilePlayingDescription'),
            this.cacheEnabled,
            (val: boolean) => this.handleCacheChange(val),
          )

          // ═══ 存储管理 Section ═══
          this.SectionTitle(t('settings.storage'))

          this.ActionRow(
            t('settings.coverCache'),
            t('settings.tapToClear'),
            () => {},
          )

          this.ActionRow(
            t('settings.musicCache'),
            t('settings.tapToClear'),
            () => {},
          )

          this.ActionRow(
            t('settings.audiobookCache'),
            t('settings.tapToClear'),
            () => {},
          )

          // ═══ 关于 Section ═══
          this.SectionTitle(t('settings.about'))

          this.ActionRow(
            t('settings.productUpdates'),
            t('settings.productUpdatesDescription'),
            () => {},
          )

          this.ActionRow(
            t('settings.checkUpdate'),
            t('settings.checkUpdateDescription'),
            () => {},
          )

          this.ActionRow(
            t('settings.joinBetaTest'),
            t('settings.betaTestDescription'),
            () => {},
          )

          this.SwitchRow(
            t('settings.experienceProgram'),
            t('settings.experienceProgramDescription'),
            this.experienceProgramEnabled,
            (val: boolean) => { this.experienceProgramEnabled = val; this.updateBoolSetting('experienceProgramEnabled', val); },
          )

          // ═══ 退出登录 ═══
          Button(t('settings.logout'))
            .width('100%')
            .height(50)
            .backgroundColor('#FF3B30')
            .fontColor('#FFFFFF')
            .fontSize(17)
            .fontWeight(FontWeight.Medium)
            .borderRadius(12)
            .margin({ top: 30 })
            .onClick(() => this.logout())

          // Footer version
          Text(`AudioDock HarmonyOS v${this.version}`)
            .fontSize(12)
            .fontColor(this.theme.colors.textSecondary)
            .margin({ top: 50, bottom: 40 })
            .textAlign(TextAlign.Center)
            .width('100%')
        }
        .width('100%')
        .padding({ left: 20, right: 20 })
      }
      .width('100%')
      .layoutWeight(1)
      .scrollBar(BarState.Off)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.theme.colors.background)
  }
}
