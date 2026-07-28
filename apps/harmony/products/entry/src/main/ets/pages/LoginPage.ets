import router from '@ohos.router';
import { buildTheme, CommonNavBar, CommonButton, type Theme, type ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { HttpError } from 'features_network';
import { authStore } from '../context/AuthStore';

@Entry
@Component
struct LoginPage {
  @State username: string = '';
  @State password: string = '';
  @State errorMsg: string = '';
  @State loading: boolean = false;
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  private theme: Theme = buildTheme('light');

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  build() {
    Column() {
      CommonNavBar({
        title: t('login.title'),
        theme: this.theme,
        onBack: (): void => { router.back(); },
      });
      Column({ space: 16 }) {
        Text(t('login.heading')).fontSize(20).fontWeight(600).margin({ top: 24 });
        TextInput({ placeholder: t('login.username'), text: this.username })
          .onChange((v: string): void => { this.username = v; })
          .borderRadius(8).padding(12);
        TextInput({ placeholder: t('login.password'), text: this.password })
          .onChange((v: string): void => { this.password = v; })
          .type(InputType.Password)
          .borderRadius(8).padding(12);
        if (this.errorMsg) Text(this.errorMsg).fontColor(this.theme.colors.error);
        CommonButton({
          label: this.loading ? t('common.loading') : t('common.login'),
          theme: this.theme,
          disabled: this.loading,
          onButtonClick: (): void => { this.doLogin(); },
        });
        Text(t('login.register_tip'))
          .onClick((): void => { router.replaceUrl({ url: 'pages/SignUpPage' }); })
          .fontColor(this.theme.colors.primary);
      }.padding(16);
    }.width('100%').height('100%').backgroundColor(this.theme.colors.background);
  }

  private async doLogin(): Promise<void> {
    this.loading = true;
    this.errorMsg = '';
    try {
      await authStore.login({ username: this.username, password: this.password });
      router.replaceUrl({ url: 'pages/MainPage' });
    } catch (e) {
      this.errorMsg = e instanceof HttpError ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }
}