import router from '@ohos.router';
import { kvStore } from 'features_storage';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';
import { t, applySetting, I18N_STORAGE_KEY } from 'features_i18n';
import type { LangSetting } from 'features_i18n';

class LangOption {
  code: LangSetting = 'system';
  label: string = '';

  constructor(code: LangSetting, label: string) {
    this.code = code;
    this.label = label;
  }
}

@Entry
@Component
struct LanguagePage {
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  private theme: Theme = buildTheme('light');
  @State selectedLang: string = 'system';

  private options: LangOption[] = [
    new LangOption('system', '跟随系统'),
    new LangOption('zh-CN', '简体中文'),
    new LangOption('en', 'English'),
  ];

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    this.loadCurrent();
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  async loadCurrent() {
    const saved = await kvStore.get(I18N_STORAGE_KEY);
    this.selectedLang = saved ?? 'system';
  }

  async handleSelect(code: LangSetting) {
    this.selectedLang = code;
    await kvStore.set(I18N_STORAGE_KEY, code);
    applySetting(code);
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
        .onClick((): void => router.back())

        Text(t('settings.language'))
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor(this.theme.colors.text)
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Row().width(40).height(40)
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 16, bottom: 15 })

      // Language list
      Column() {
        ForEach(this.options, (option: LangOption): void => {
          Row() {
            Text(option.label)
              .fontSize(16)
              .fontColor(this.theme.colors.text)
              .layoutWeight(1)

            if (this.selectedLang === option.code) {
              Text('✓')
                .fontSize(20)
                .fontWeight(FontWeight.Bold)
                .fontColor(this.theme.colors.primary)
            }
          }
          .width('100%')
          .padding({ top: 16, bottom: 16 })
          .borderWidth({ bottom: 0.5 })
          .borderColor(this.theme.colors.border)
          .onClick(() => this.handleSelect(option.code))
        }, (option: LangOption): string => option.code)
      }
      .width('100%')
      .padding({ left: 20, right: 20 })
      .margin({ top: 10 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.theme.colors.background)
  }
}
