import router from '@ohos.router';
import { httpClient } from '../utils/HttpClient';
import { storage } from '../utils/StorageManager';
import {
  login as loginApi,
  register as registerApi,
  SOURCEMAP,
  SOURCETIPSMAP,
  selectBestServer
} from '../utils/ApiService';

interface LoginParams {
  sourceType?: string;
}

class SourceConfig {
  id: string = '';
  internal: string = '';
  external: string = '';
  name: string = '';

  constructor(id: string, internal: string, external: string, name: string) {
    this.id = id;
    this.internal = internal;
    this.external = external;
    this.name = name;
  }
}

@Entry
@Component
struct LoginPage {
  @State sourceType: string = 'AudioDock';
  @State isLogin: boolean = true;
  @State loading: boolean = false;
  @State errorMessage: string = '';

  @State externalAddress: string = '';
  @State internalAddress: string = '';
  @State username: string = '';
  @State password: string = '';
  @State confirmPassword: string = '';

  private tipsMap: Record<string, string> = SOURCETIPSMAP;

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
    this.internalAddress = this.defaultAddressMap[this.sourceType] || '';
    this.loadSavedConfig();
  }

  async loadSavedConfig() {
    try {
      const configStr = await storage.getItem('sourceConfig_' + this.sourceType);
      if (configStr) {
        const parsed = JSON.parse(configStr) as Object;
        if (parsed instanceof Array && parsed.length > 0) {
          const lastConfig = parsed[parsed.length - 1] as Record<string, string>;
          this.internalAddress = lastConfig['internal'] || '';
          this.externalAddress = lastConfig['external'] || '';
          await this.restoreCredentials();
        }
      }
    } catch (e) {
      console.error('Failed to load saved config:', e);
    }
  }

  async restoreCredentials() {
    try {
      const bestAddress = this.externalAddress || this.internalAddress;
      if (!bestAddress) {
        return;
      }
      const credsKey = 'creds_' + this.sourceType + '_' + bestAddress;
      const savedCreds = await storage.getItem(credsKey);
      if (savedCreds) {
        const creds = JSON.parse(savedCreds) as Record<string, string>;
        if (creds['username']) {
          this.username = creds['username'];
        }
        if (creds['password']) {
          this.password = creds['password'];
        }
      }
    } catch (e) {
      console.error('Failed to restore credentials:', e);
    }
  }

  async handleSubmit() {
    this.errorMessage = '';

    if (!this.externalAddress && !this.internalAddress) {
      this.errorMessage = '请至少输入一个数据源地址（内网或外网）';
      return;
    }
    if (!this.username || !this.password) {
      this.errorMessage = '请填写用户名和密码';
      return;
    }
    if (!this.isLogin && this.password !== this.confirmPassword) {
      this.errorMessage = '两次输入的密码不一致';
      return;
    }

    this.loading = true;

    try {
      const bestAddress = await selectBestServer(this.internalAddress, this.externalAddress, this.sourceType);
      if (!bestAddress) {
        this.errorMessage = '无法连接到任一服务器地址，请检查网络或地址输入';
        this.loading = false;
        return;
      }

      httpClient.setBaseURL(bestAddress);
      await this.saveSourceConfig(bestAddress);

      const mappedType = SOURCEMAP[this.sourceType] || 'audiodock';
      let response: Object;

      if (this.isLogin) {
        const loginBody: Record<string, Object> = {};
        loginBody['username'] = this.username;
        loginBody['password'] = this.password;
        loginBody['deviceName'] = 'HarmonyOS';
        console.log("[Login] Request params:", JSON.stringify(loginBody));
        response = await loginApi(loginBody);
        console.log("[Login] Response:", JSON.stringify(response));
      } else {
        if (mappedType === 'subsonic') {
          this.errorMessage = 'Subsonic 数据源不支持注册';
          this.loading = false;
          return;
        }
        const registerBody: Record<string, Object> = {};
        registerBody['username'] = this.username;
        registerBody['password'] = this.password;
        registerBody['deviceName'] = 'HarmonyOS';
        console.log("[Register] Request params:", JSON.stringify(registerBody));
        response = await registerApi(registerBody);
        console.log("[Register] Response:", JSON.stringify(response));
      }

      const res = response as Record<string, Object>;
      const code = res['code'] as number;

      if (code === 200 || code === 201) {
        const data = res['data'] as Record<string, Object>;
        let token: string | null = null;

        if (data['token']) {
          token = data['token'] as string;
        } else if (data['accessToken']) {
          token = data['accessToken'] as string;
        }

        if (token) {
          httpClient.setToken(token);
          await storage.setItem('token_' + bestAddress, token);
        }

        let user: Object | null = null;
        if (data['user']) {
          user = data['user'] as Object;
        } else {
          user = data;
        }

        if (user) {
          const userStr = JSON.stringify(user);
          await storage.setItem('user_' + bestAddress, userStr);
          await storage.setItem('currentUser', userStr);
        }

        await storage.setItem(
          'creds_' + this.sourceType + '_' + bestAddress,
          JSON.stringify({ username: this.username, password: this.password })
        );

        await storage.setItem('serverAddress', bestAddress);
        await storage.setItem('selectedSourceType', this.sourceType);

        router.replaceUrl({ url: 'pages/HomePage' });
      } else {
        const msg = res['message'] as string;
        this.errorMessage = msg || '登录失败';
      }
    } catch (error) {
      console.error('Login/Register error:', error);
      if (error instanceof Error) {
        this.errorMessage = error.message || '网络请求失败，请检查服务器地址';
      } else {
        this.errorMessage = '网络请求失败，请检查服务器地址';
      }
    } finally {
      this.loading = false;
    }
  }

  async saveSourceConfig(bestAddress: string) {
    const configKey = 'sourceConfig_' + this.sourceType;
    let existingConfigs: SourceConfig[] = [];

    try {
      const existingStr = await storage.getItem(configKey);
      if (existingStr) {
        const parsed = JSON.parse(existingStr) as Object;
        if (parsed instanceof Array) {
          for (let i = 0; i < parsed.length; i++) {
            const c = parsed[i] as Record<string, string>;
            existingConfigs.push(new SourceConfig(c['id'], c['internal'], c['external'], c['name']));
          }
        }
      }
    } catch {
      existingConfigs = [];
    }

    let existingIndex = -1;
    for (let i = 0; i < existingConfigs.length; i++) {
      if (existingConfigs[i].internal === this.internalAddress && existingConfigs[i].external === this.externalAddress) {
        existingIndex = i;
        break;
      }
    }

    if (existingIndex === -1) {
      existingConfigs.push(new SourceConfig(
        Date.now().toString(),
        this.internalAddress,
        this.externalAddress,
        '服务器 ' + (existingConfigs.length + 1)
      ));
    }

    await storage.setItem(configKey, JSON.stringify(existingConfigs));
    await storage.setItem('serverAddress_' + this.sourceType, bestAddress);
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

      Text(this.tipsMap[this.sourceType] || '')
        .fontSize(13)
        .fontColor('#95a5a6')
        .margin({ left: 16, right: 16, bottom: 24 })
        .textAlign(TextAlign.Center)

      if (this.errorMessage.length > 0) {
        Text(this.errorMessage)
          .fontSize(13)
          .fontColor('#e74c3c')
          .margin({ left: 16, right: 16, bottom: 16 })
          .backgroundColor('#fdeaea')
          .padding(12)
          .borderRadius(8)
          .width('100%')
      }

      Scroll() {
        Column() {
          this.FormInput('外网地址', 'https://example.com', this.externalAddress, (val) => this.externalAddress = val);
          this.FormInput('内网地址', 'http://192.168.x.x:3000', this.internalAddress, (val) => this.internalAddress = val);

          Divider()
            .margin({ top: 8, bottom: 24 })
            .color('#ecf0f1')

          this.FormInput('用户名', '请输入用户名', this.username, (val) => this.username = val);
          this.FormInput('密码', '请输入密码', this.password, (val) => this.password = val, true);

          if (!this.isLogin) {
            this.FormInput('确认密码', '请再次输入密码', this.confirmPassword, (val) => this.confirmPassword = val, true);
          }

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

          Button(this.isLogin ? '没有账号？去注册' : '已有账号？去登录')
            .width('100%')
            .height(44)
            .backgroundColor(Color.Transparent)
            .fontSize(14)
            .fontColor('#007DFF')
            .margin({ top: 16 })
            .onClick(() => {
              this.isLogin = !this.isLogin;
              this.errorMessage = '';
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
