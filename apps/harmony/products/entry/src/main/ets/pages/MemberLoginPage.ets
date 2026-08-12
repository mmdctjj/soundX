import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { buildTheme, type Theme, type ThemeMode } from 'features_ui';
import { t, getLang } from 'features_i18n';
import { kvStore } from 'features_storage';
import { Logger } from 'audiodock_common';
import { plusApi, setPlusAuthToken } from 'features_network';

@Entry
@Component
struct MemberLoginPage {
  @State phone: string = '';
  @State code: string = '';
  @State loading: boolean = false;
  @State sendingCode: boolean = false;
  @State countdown: number = 0;
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @State private langAtBuild: string = getLang();
  @State theme: Theme = buildTheme('light');
  private timer: number = -1;

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
  }

  aboutToDisappear(): void {
    if (this.timer !== -1) {
      clearInterval(this.timer);
      this.timer = -1;
    }
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  async handleSendCode(): Promise<void> {
    const p = this.phone.trim();
    if (p.length < 11) {
      promptAction.showToast({ message: t('memberLogin.validPhone') });
      return;
    }
    this.sendingCode = true;
    try {
      await plusApi.sendCode(p);
      promptAction.showToast({ message: t('memberLogin.codeSent') });
      this.startCountdown();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      promptAction.showToast({ message: msg || t('memberLogin.codeFailed') });
      Logger.e('MemberLogin', `sendCode failed: ${msg}`);
    } finally {
      this.sendingCode = false;
    }
  }

  startCountdown(): void {
    this.countdown = 60;
    if (this.timer !== -1) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.countdown -= 1;
      if (this.countdown <= 0) {
        clearInterval(this.timer);
        this.timer = -1;
        this.countdown = 0;
      }
    }, 1000);
  }

  async handleLogin(): Promise<void> {
    const p = this.phone.trim();
    const c = this.code.trim();
    if (!p || !c) {
      promptAction.showToast({ message: t('member.enterPhoneAndCode') });
      return;
    }
    this.loading = true;
    try {
      const res = await plusApi.login(p, c);
      await kvStore.set('plus_token', res.token);
      await kvStore.set('plus_user_id', res.userId);
      setPlusAuthToken(res.token);
      promptAction.showToast({ message: t('memberLogin.loginSuccess') });
      router.replaceUrl({ url: 'pages/MemberDetailPage' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      promptAction.showToast({ message: msg || t('memberLogin.loginFailed') });
      Logger.e('MemberLogin', `login failed: ${msg}`);
    } finally {
      this.loading = false;
    }
  }

  onPageShow(): void {
    // 语言可能在后台（语言页/系统设置）被修改：回显时若语言已变化，切换 if 分支重建整页。
    // 不能在隐藏时重建——@StorageProp 在后台更新触发的重建会导致路由页触摸失效，
    // 因此用 langAtBuild 把重建延迟到页面可见时。
    const cur = getLang();
    if (cur !== this.langAtBuild) this.langAtBuild = cur;
  }

  build() {
    // 语言切换时重建整页：条件读取 langAtBuild 建立依赖（框架只追踪读取状态变量的表达式，
    // t() 是普通函数无法被追踪），语言变化使 if 分支切换，旧子树销毁、新子树重建，
    // 所有 t() 文案（含局部 @Builder 和 @Prop 传串的子组件）都按新语言重新求值。
    if (this.langAtBuild === 'zh-CN') {
      this.LocalizedContent()
    } else {
      this.LocalizedContent()
    }
  }

  @Builder
  LocalizedContent() {
    Column() {
      Scroll() {
        Column() {
          // Logo + Title
          Column() {
            Image($r('app.media.logo'))
              .width(80).height(80).borderRadius(16)
              .margin({ bottom: 20 })
            Text(t('memberLogin.userLogin'))
              .fontSize(24).fontWeight(FontWeight.Bold)
              .fontColor(this.theme.colors.text)
              .margin({ bottom: 8 })
            Text(t('memberLogin.subtitle'))
              .fontSize(14)
              .fontColor(this.theme.colors.textSecondary)
          }
          .width('100%').alignItems(HorizontalAlign.Center)
          .margin({ bottom: 40 })

          // Phone input
          Column() {
            Text(t('memberLogin.phone'))
              .fontSize(14).fontWeight(FontWeight.Medium)
              .fontColor(this.theme.colors.text)
              .margin({ bottom: 5 })
              .alignSelf(ItemAlign.Start)
            TextInput({ placeholder: t('memberLogin.enterPhone'), text: this.phone })
              .type(InputType.PhoneNumber)
              .height(50)
              .borderRadius(12)
              .border({ width: 1, color: this.theme.colors.border })
              .backgroundColor(this.theme.colors.card)
              .fontColor(this.theme.colors.text)
              .fontSize(16)
              .padding({ left: 15, right: 15 })
              .onChange((v: string) => { this.phone = v; })
          }
          .width('100%').margin({ bottom: 15 })

          // Code input + send button
          Column() {
            Text(t('memberLogin.verificationCode'))
              .fontSize(14).fontWeight(FontWeight.Medium)
              .fontColor(this.theme.colors.text)
              .margin({ bottom: 5 })
              .alignSelf(ItemAlign.Start)
            Row() {
              TextInput({ placeholder: t('memberLogin.enterCode'), text: this.code })
                .type(InputType.Number)
                .height(50)
                .layoutWeight(1)
                .borderRadius(12)
                .border({ width: { left: 1, top: 1, bottom: 1 }, color: this.theme.colors.border })
                .backgroundColor(this.theme.colors.card)
                .fontColor(this.theme.colors.text)
                .fontSize(16)
                .padding({ left: 15, right: 15 })
                .onChange((v: string) => { this.code = v; })

              Button(this.sendingCode ? '...' : (this.countdown > 0 ? `${this.countdown}s` : t('memberLogin.getCode')))
                .height(50)
                .constraintSize({ minWidth: 110 })
                .borderRadius(12)
                .border({ width: { right: 1, top: 1, bottom: 1 }, color: this.theme.colors.border })
                .backgroundColor(this.theme.colors.primary)
                .fontColor(this.theme.colors.background)
                .fontSize(14).fontWeight(FontWeight.Bold)
                .enabled(this.countdown === 0 && !this.sendingCode)
                .opacity(this.countdown > 0 || this.sendingCode ? 0.6 : 1)
                .onClick(() => this.handleSendCode())
            }
            .width('100%')
          }
          .width('100%').margin({ bottom: 15 })

          // Login button
          Button() {
            if (this.loading) {
              LoadingProgress().width(24).height(24).color(this.theme.colors.background)
            } else {
              Text(t('memberLogin.login'))
                .fontSize(16).fontWeight(FontWeight.Bold)
                .fontColor(this.theme.colors.background)
            }
          }
          .width('100%').height(50)
          .borderRadius(12)
          .backgroundColor(this.theme.colors.primary)
          .margin({ top: 20, bottom: 20 })
          .enabled(!this.loading)
          .onClick(() => this.handleLogin())

          // Privacy links
          Row() {
            Text(t('memberLogin.loginAgree'))
              .fontSize(12).fontColor(this.theme.colors.textSecondary)
            Text(t('memberLogin.privacyPolicy'))
              .fontSize(12).fontColor('#1677ff')
            Text(t('memberLogin.and'))
              .fontSize(12).fontColor(this.theme.colors.textSecondary)
            Text(t('memberLogin.userAgreement'))
              .fontSize(12).fontColor('#1677ff')
          }
          .width('100%').justifyContent(FlexAlign.Center)
          .margin({ top: 10 })
        }
        .width('100%')
        .padding({ left: 30, right: 30, top: 60 })
      }
      .width('100%').layoutWeight(1)
      .scrollBar(BarState.Off)
    }
    .width('100%').height('100%')
    .backgroundColor(this.theme.colors.background)
  }
}
