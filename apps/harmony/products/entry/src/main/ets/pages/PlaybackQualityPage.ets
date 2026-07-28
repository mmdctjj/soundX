import router from '@ohos.router';
import { kvStore } from 'features_storage';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { getInternalQuality, getExternalQuality } from '../services/trackQuality';
import type { Quality } from '../services/trackQuality';

class QualityOption {
  value: Quality = 'high';
  labelKey: string = '';
  descriptionKey: string = '';

  constructor(value: Quality, labelKey: string, descriptionKey: string) {
    this.value = value;
    this.labelKey = labelKey;
    this.descriptionKey = descriptionKey;
  }
}

@Entry
@Component
struct PlaybackQualityPage {
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  private theme: Theme = buildTheme('light');
  @State isInternal: boolean = true;
  @State selectedQuality: string = 'high';

  private options: QualityOption[] = [
    new QualityOption('lossless', 'settings.playbackQualityLossless', 'settings.playbackQualityLosslessDescription'),
    new QualityOption('high', 'settings.playbackQualityHigh', 'settings.playbackQualityHighDescription'),
    new QualityOption('standard', 'settings.playbackQualityLow', 'settings.playbackQualityLowDescription'),
  ];

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    interface RouterParams { network?: string }
    const p = router.getParams() as RouterParams;
    this.isInternal = (p.network ?? 'internal') === 'internal';
    this.loadCurrent();
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  async loadCurrent() {
    const q = this.isInternal ? await getInternalQuality() : await getExternalQuality();
    this.selectedQuality = q;
  }

  async handleSelect(quality: Quality) {
    const key = this.isInternal ? 'internalPlaybackQuality' : 'externalPlaybackQuality';
    await kvStore.set(key, quality);
    router.back();
  }

  getTitle(): string {
    return this.isInternal
      ? t('settings.internalPlaybackQuality')
      : t('settings.externalPlaybackQuality');
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

        Text(this.getTitle())
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor(this.theme.colors.text)
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Row().width(40).height(40)
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 16, bottom: 15 })

      // Quality options list
      Column() {
        ForEach(this.options, (option: QualityOption): void => {
          Row() {
            Column() {
              Text(t(option.labelKey))
                .fontSize(16)
                .fontWeight(FontWeight.Medium)
                .fontColor(this.theme.colors.text)
              Text(t(option.descriptionKey))
                .fontSize(13)
                .fontColor(this.theme.colors.textSecondary)
                .margin({ top: 4 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Start)
            .margin({ right: 16 })

            if (this.selectedQuality === option.value) {
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
          .onClick((): void => this.handleSelect(option.value))
        }, (option: QualityOption): string => option.value)
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
