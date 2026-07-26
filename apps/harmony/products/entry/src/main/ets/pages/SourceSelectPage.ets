import router from '@ohos.router';
import { buildTheme, CommonNavBar, CommonButton, type Theme } from 'features_ui';
import { t } from 'features_i18n';
import { httpClient } from 'features_network';
import { kvStore } from 'features_storage';

@Entry
@Component
struct SourceSelectPage {
  @State serverUrl: string = '';
  @State serverName: string = '';
  private theme: Theme = buildTheme('light');

  build() {
    Column() {
      CommonNavBar({ title: t('source_select.title'), showBack: false, theme: this.theme });
      Column({ space: 16 }) {
        Text(t('source_select.heading')).fontSize(20).fontWeight(600).margin({ top: 24 });
        TextInput({ placeholder: t('source_select.url_placeholder'), text: this.serverUrl })
          .onChange((v: string): void => { this.serverUrl = v; })
          .borderRadius(8).padding(12);
        TextInput({ placeholder: t('source_select.name_placeholder'), text: this.serverName })
          .onChange((v: string): void => { this.serverName = v; })
          .borderRadius(8).padding(12);
        CommonButton({
          label: t('common.next'),
          theme: this.theme,
          onClick: (): void => { this.saveAndNext(); },
        });
      }.padding(16);
    }.width('100%').height('100%').backgroundColor(this.theme.colors.background);
  }

  private async saveAndNext(): Promise<void> {
    const url = this.serverUrl.trim();
    if (!url) return;
    await kvStore.set('serverAddress', url);
    httpClient.setBaseURL(url);
    router.replaceUrl({ url: 'pages/LoginPage' });
  }
}