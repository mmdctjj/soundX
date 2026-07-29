import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { buildTheme, type Theme, type ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { HttpError } from 'features_network';
import { kvStore } from 'features_storage';
import { Logger } from 'audiodock_common';
import { authStore } from '../context/AuthStore';
import { SOURCEMAP, SOURCETIPSMAP, selectBestServer } from '../utils/networkUtils';

interface SourceConfig {
  internal?: string;
  external?: string;
}

interface Creds {
  username?: string;
  password?: string;
}

@Entry
@Component
struct LoginPage {
  @State sourceType: string = 'AudioDock';
  @State isLogin: boolean = true;
  @State loading: boolean = false;
  @State externalAddress: string = '';
  @State internalAddress: string = '';
  @State username: string = '';
  @State password: string = '';
  @State confirmPassword: string = '';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @State theme: Theme = buildTheme('light');

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    const params = router.getParams() as Record<string, string> | undefined;
    const rawType: string = params?.['sourceType'] ?? 'AudioDock';
    this.sourceType = this.normalizeSourceType(rawType);
    this.loadSourceConfig();
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  // 归一化数据源类型为 mobile 端的大写展示形式（AudioDock / Subsonic / Emby）
  private normalizeSourceType(raw: string): string {
    const lower: string = raw.toLowerCase();
    if (lower === 'subsonic') {
      return 'Subsonic';
    }
    if (lower === 'emby') {
      return 'Emby';
    }
    return 'AudioDock';
  }

  private logoResource(): Resource {
    if (this.sourceType === 'Subsonic') {
      return $r('app.media.subsonic');
    }
    if (this.sourceType === 'Emby') {
      return $r('app.media.emby');
    }
    return $r('app.media.logo');
  }

  // 对齐 mobile loadSourceConfig：恢复上次填写的地址与凭据
  private async loadSourceConfig(): Promise<void> {
    try {
      const raw: string | null = await kvStore.get(`sourceConfig_${this.sourceType}`);
      if (raw) {
        const parsed = JSON.parse(raw) as SourceConfig;
        this.internalAddress = parsed.internal ?? '';
        this.externalAddress = parsed.external ?? '';
        const addr: string = parsed.external || parsed.internal || '';
        if (addr) {
          await this.restoreCredentials(addr);
        }
      } else if (this.sourceType === 'AudioDock') {
        this.internalAddress = 'http://localhost:3000';
      }
    } catch (e) {
      Logger.w('LoginPage', `load source config failed: ${String(e)}`);
    }
  }

  private async restoreCredentials(address: string): Promise<void> {
    try {
      const raw: string | null = await kvStore.get(`creds_${this.sourceType}_${address}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Creds;
        if (parsed.username) {
          this.username = parsed.username;
        }
        if (parsed.password) {
          this.password = parsed.password;
        }
      }
    } catch (e) {
      Logger.w('LoginPage', `restore credentials failed: ${String(e)}`);
    }
  }

  private async handleSubmit(): Promise<void> {
    const internal: string = this.internalAddress.trim();
    const external: string = this.externalAddress.trim();
    if (!internal && !external) {
      promptAction.showToast({ message: '请至少输入一个数据源地址（内网或外网）' });
      return;
    }
    if (!this.username || !this.password) {
      promptAction.showToast({ message: t('login.fillUsernameAndPassword') });
      return;
    }
    if (!this.isLogin && this.password !== this.confirmPassword) {
      promptAction.showToast({ message: t('login.passwordMismatch') });
      return;
    }

    this.loading = true;
    try {
      const bestAddress: string | null = await selectBestServer(internal, external, this.sourceType);
      if (!bestAddress) {
        promptAction.showToast({ message: t('login.cannotConnectAnyAddress') });
        return;
      }

      const mappedType: string = SOURCEMAP[this.sourceType] || 'audiodock';

      // 持久化数据源配置与凭据（对齐 mobile）
      const config: SourceConfig = { internal: internal, external: external };
      await kvStore.set(`sourceConfig_${this.sourceType}`, JSON.stringify(config));
      const creds: Creds = { username: this.username, password: this.password };
      await kvStore.set(`creds_${this.sourceType}_${bestAddress}`, JSON.stringify(creds));

      // 切换服务器：写入地址与类型后重载认证状态（baseURL + sourceType + 凭据）
      await kvStore.set('serverAddress', bestAddress);
      await kvStore.set('selectedSourceType', mappedType);
      await authStore.loadFromStorage();

      if (this.isLogin) {
        await authStore.login({ username: this.username, password: this.password });
      } else {
        if (mappedType === 'subsonic') {
          promptAction.showToast({ message: t('login.subsonicNoRegisterSupport') });
          return;
        }
        await authStore.register({ username: this.username, password: this.password });
      }

      router.replaceUrl({ url: 'pages/MainPage' });
    } catch (e) {
      promptAction.showToast({ message: e instanceof HttpError ? e.message : String(e) });
    } finally {
      this.loading = false;
    }
  }

  @Builder
  FieldLabel(label: string) {
    Text(label)
      .fontSize(14)
      .fontWeight(FontWeight.Medium)
      .fontColor(this.theme.colors.text)
      .textAlign(TextAlign.Start)
      .alignSelf(ItemAlign.Start)
      .margin({ bottom: 5, top: 4 })
  }

  build() {
    Column() {
      // 顶部：切换类型
      Row() {
        Text(t('loginForm.switchType'))
          .fontSize(12)
          .fontColor(this.theme.colors.text)
          .padding(5)
          .onClick((): void => {
            router.replaceUrl({ url: 'pages/SourceSelectPage' });
          })
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 16 })
      .justifyContent(FlexAlign.Start)

      Scroll() {
        Column() {
          // Logo + 标题
          Column() {
            Image(this.logoResource())
              .width(80)
              .height(80)
              .borderRadius(16)
              .margin({ bottom: 20 })
            Text(`${this.sourceType} ${this.isLogin ? t('loginForm.login') : t('loginForm.register')}`)
              .fontSize(24)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.theme.colors.text)
              .textAlign(TextAlign.Center)
              .margin({ bottom: 8 })
          }
          .width('100%')
          .alignItems(HorizontalAlign.Center)
          .margin({ top: 24, bottom: 16 })

          // 数据源说明
          Text(SOURCETIPSMAP[this.sourceType] ?? '')
            .fontSize(13)
            .fontColor(this.theme.colors.textSecondary)
            .textAlign(TextAlign.Center)
            .lineHeight(20)
            .margin({ bottom: 16 })

          // 外网地址
          this.FieldLabel(t('loginForm.externalAddress'));
          TextInput({ placeholder: 'http://music.example.com', text: this.externalAddress })
            .onChange((v: string): void => { this.externalAddress = v; })
            .height(50)
            .fontSize(16)
            .fontColor(this.theme.colors.text)
            .placeholderColor(this.theme.colors.textSecondary)
            .backgroundColor(this.theme.colors.surface)
            .borderRadius(12)
            .border({ width: 1, color: this.theme.colors.border })
            .padding({ left: 15, right: 15 })
            .margin({ bottom: 16 })

          // 内网地址
          this.FieldLabel(t('loginForm.internalAddress'));
          TextInput({ placeholder: 'http://192.168.x.x:3000', text: this.internalAddress })
            .onChange((v: string): void => { this.internalAddress = v; })
            .height(50)
            .fontSize(16)
            .fontColor(this.theme.colors.text)
            .placeholderColor(this.theme.colors.textSecondary)
            .backgroundColor(this.theme.colors.surface)
            .borderRadius(12)
            .border({ width: 1, color: this.theme.colors.border })
            .padding({ left: 15, right: 15 })
            .margin({ bottom: 16 })

          // 用户名
          this.FieldLabel(t('login.username'));
          TextInput({ placeholder: '请输入用户名', text: this.username })
            .onChange((v: string): void => { this.username = v; })
            .height(50)
            .fontSize(16)
            .fontColor(this.theme.colors.text)
            .placeholderColor(this.theme.colors.textSecondary)
            .backgroundColor(this.theme.colors.surface)
            .borderRadius(12)
            .border({ width: 1, color: this.theme.colors.border })
            .padding({ left: 15, right: 15 })
            .margin({ bottom: 16 })

          // 密码
          this.FieldLabel(t('login.password'));
          TextInput({ placeholder: '请输入密码', text: this.password })
            .onChange((v: string): void => { this.password = v; })
            .type(InputType.Password)
            .height(50)
            .fontSize(16)
            .fontColor(this.theme.colors.text)
            .placeholderColor(this.theme.colors.textSecondary)
            .backgroundColor(this.theme.colors.surface)
            .borderRadius(12)
            .border({ width: 1, color: this.theme.colors.border })
            .padding({ left: 15, right: 15 })
            .margin({ bottom: 16 })

          // 确认密码（仅注册模式）
          if (!this.isLogin) {
            this.FieldLabel(t('loginForm.confirmPasswordLabel'));
            TextInput({ placeholder: '请再次输入密码', text: this.confirmPassword })
              .onChange((v: string): void => { this.confirmPassword = v; })
              .type(InputType.Password)
              .height(50)
              .fontSize(16)
              .fontColor(this.theme.colors.text)
              .placeholderColor(this.theme.colors.textSecondary)
              .backgroundColor(this.theme.colors.surface)
              .borderRadius(12)
              .border({ width: 1, color: this.theme.colors.border })
              .padding({ left: 15, right: 15 })
              .margin({ bottom: 16 })
          }

          // 提交按钮
          Button() {
            if (this.loading) {
              LoadingProgress()
                .width(24)
                .height(24)
                .color(this.theme.colors.onPrimary)
            } else {
              Text(this.isLogin ? t('loginForm.login') : t('loginForm.register'))
                .fontSize(16)
                .fontWeight(FontWeight.Medium)
                .fontColor(this.theme.colors.onPrimary)
            }
          }
          .width('100%')
          .height(50)
          .backgroundColor(this.theme.colors.primary)
          .borderRadius(14)
          .enabled(!this.loading)
          .margin({ top: 8 })
          .onClick((): void => { this.handleSubmit(); })

          // 登录/注册切换
          Text(this.isLogin ? t('login.noAccount') : t('login.hasAccount'))
            .fontSize(14)
            .fontColor(this.theme.colors.primary)
            .textAlign(TextAlign.Center)
            .width('100%')
            .margin({ top: 16, bottom: 32 })
            .onClick((): void => { this.isLogin = !this.isLogin; })
        }
        .width('100%')
        .padding({ left: 24, right: 24 })
        .constraintSize({ maxWidth: 600 })
      }
      .layoutWeight(1)
      .scrollBar(BarState.Off)
      .align(Alignment.Top)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.theme.colors.background)
  }
}
