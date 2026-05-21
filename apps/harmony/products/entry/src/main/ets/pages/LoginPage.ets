import router from '@ohos.router';

interface LoginParams {
  sourceType?: string;
}

@Entry
@Component
struct LoginPage {
  @State sourceType: string = 'AudioDock';
  @State isLogin: boolean = true;
  @State loading: boolean = false;

  // Form fields
  @State externalAddress: string = '';
  @State internalAddress: string = '';
  @State username: string = '';
  @State password: string = '';
  @State confirmPassword: string = '';

  // Tips map
  private tipsMap: Record<string, string> = {
    'AudioDock': '自建 AudioDock 服务端，支持完整的音乐管理功能',
    'Subsonic': '兼容 Subsonic/API 协议的音乐服务器',
    'Emby': 'Emby 媒体服务器'
  };

  // Default addresses
  private defaultAddressMap: Record<string, string> = {
    'AudioDock': 'http://localhost:3000',
    'Subsonic': '',
    'Emby': ''
  };

  aboutToAppear() {
    const params = router.getParams() as LoginParams;
    if (params && params.sourceType) {
      this.sourceType = params.sourceType;
    }
    // Set default address
    this.internalAddress = this.defaultAddressMap[this.sourceType] || '';
  }

  handleSubmit() {
    if (!this.externalAddress && !this.internalAddress) {
      // Show toast or alert
      return;
    }
    if (!this.username || !this.password) {
      return;
    }
    if (!this.isLogin && this.password !== this.confirmPassword) {
      return;
    }

    this.loading = true;
    // TODO: Implement actual login logic
    setTimeout(() => {
      this.loading = false;
      // Navigate to home page after login
      router.replaceUrl({ url: 'pages/HomePage' });
    }, 1500);
  }

  @Builder
  FormInput(label: string, placeholder: string, text: string, onChange: (value: string) => void, isPassword: boolean = false) {
    Column() {
      Text(label)
        .fontSize(14)
        .fontWeight(FontWeight.Medium)
        .fontColor('#2c3e50')
        .margin({ bottom: 8 })
        .alignSelf(ItemAlign.Start)

      TextInput({ text: text, placeholder: placeholder })
        .type(isPassword ? InputType.Password : InputType.Normal)
        .height(48)
        .backgroundColor('#f8f9fa')
        .borderRadius(8)
        .padding({ left: 16, right: 16 })
        .fontSize(14)
        .onChange(onChange)
    }
    .width('100%')
    .margin({ bottom: 16 })
  }

  build() {
    Column() {
      // Header
      Row() {
        Button('‹ 返回')
          .fontSize(14)
          .fontColor('#007DFF')
          .backgroundColor(Color.Transparent)
          .onClick(() => {
            router.back();
          })

        Text(this.sourceType + (this.isLogin ? ' 登录' : ' 注册'))
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2c3e50')

        Blank()
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 16, bottom: 16 })

      // Tips
      Text(this.tipsMap[this.sourceType] || '')
        .fontSize(13)
        .fontColor('#95a5a6')
        .margin({ left: 16, right: 16, bottom: 24 })
        .textAlign(TextAlign.Center)

      Scroll() {
        Column() {
          // Server Addresses
          this.FormInput('外网地址', 'https://example.com', this.externalAddress, (val) => this.externalAddress = val);
          this.FormInput('内网地址', 'http://192.168.x.x:3000', this.internalAddress, (val) => this.internalAddress = val);

          Divider()
            .margin({ top: 8, bottom: 24 })
            .color('#ecf0f1')

          // Credentials
          this.FormInput('用户名', '请输入用户名', this.username, (val) => this.username = val);
          this.FormInput('密码', '请输入密码', this.password, (val) => this.password = val, true);

          if (!this.isLogin) {
            this.FormInput('确认密码', '请再次输入密码', this.confirmPassword, (val) => this.confirmPassword = val, true);
          }

          // Submit Button
          Button(this.loading ? '处理中...' : (this.isLogin ? '登录' : '注册'))
            .width('100%')
            .height(50)
            .backgroundColor(this.loading ? '#bdc3c7' : '#007DFF')
            .borderRadius(12)
            .fontSize(16)
            .fontWeight(FontWeight.Medium)
            .fontColor('#FFFFFF')
            .margin({ top: 24 })
            .enabled(!this.loading)
            .onClick(() => this.handleSubmit())

          // Switch login/register
          Button(this.isLogin ? '没有账号？去注册' : '已有账号？去登录')
            .width('100%')
            .height(44)
            .backgroundColor(Color.Transparent)
            .fontSize(14)
            .fontColor('#007DFF')
            .margin({ top: 16 })
            .onClick(() => {
              this.isLogin = !this.isLogin;
            })
        }
        .width('100%')
        .padding({ left: 16, right: 16, bottom: 32 })
      }
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
  }
}
