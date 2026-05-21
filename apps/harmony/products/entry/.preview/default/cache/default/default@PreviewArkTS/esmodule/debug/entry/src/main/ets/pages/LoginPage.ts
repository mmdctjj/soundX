if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface LoginPage_Params {
    sourceType?: string;
    isLogin?: boolean;
    loading?: boolean;
    errorMessage?: string;
    externalAddress?: string;
    internalAddress?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    tipsMap?: Record<string, string>;
    defaultAddressMap?: Record<string, string>;
}
import router from "@ohos:router";
import { httpClient } from "@bundle:com.audiodock.harmony/entry/ets/utils/HttpClient";
import { storage } from "@bundle:com.audiodock.harmony/entry/ets/utils/StorageManager";
import { login as loginApi, register as registerApi, SOURCEMAP, SOURCETIPSMAP, selectBestServer } from "@bundle:com.audiodock.harmony/entry/ets/utils/ApiService";
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
class LoginPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__sourceType = new ObservedPropertySimplePU('AudioDock', this, "sourceType");
        this.__isLogin = new ObservedPropertySimplePU(true, this, "isLogin");
        this.__loading = new ObservedPropertySimplePU(false, this, "loading");
        this.__errorMessage = new ObservedPropertySimplePU('', this, "errorMessage");
        this.__externalAddress = new ObservedPropertySimplePU('', this, "externalAddress");
        this.__internalAddress = new ObservedPropertySimplePU('', this, "internalAddress");
        this.__username = new ObservedPropertySimplePU('', this, "username");
        this.__password = new ObservedPropertySimplePU('', this, "password");
        this.__confirmPassword = new ObservedPropertySimplePU('', this, "confirmPassword");
        this.tipsMap = SOURCETIPSMAP;
        this.defaultAddressMap = {
            'AudioDock': 'http://localhost:3000',
            'Subsonic': '',
            'Emby': ''
        };
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: LoginPage_Params) {
        if (params.sourceType !== undefined) {
            this.sourceType = params.sourceType;
        }
        if (params.isLogin !== undefined) {
            this.isLogin = params.isLogin;
        }
        if (params.loading !== undefined) {
            this.loading = params.loading;
        }
        if (params.errorMessage !== undefined) {
            this.errorMessage = params.errorMessage;
        }
        if (params.externalAddress !== undefined) {
            this.externalAddress = params.externalAddress;
        }
        if (params.internalAddress !== undefined) {
            this.internalAddress = params.internalAddress;
        }
        if (params.username !== undefined) {
            this.username = params.username;
        }
        if (params.password !== undefined) {
            this.password = params.password;
        }
        if (params.confirmPassword !== undefined) {
            this.confirmPassword = params.confirmPassword;
        }
        if (params.tipsMap !== undefined) {
            this.tipsMap = params.tipsMap;
        }
        if (params.defaultAddressMap !== undefined) {
            this.defaultAddressMap = params.defaultAddressMap;
        }
    }
    updateStateVars(params: LoginPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__sourceType.purgeDependencyOnElmtId(rmElmtId);
        this.__isLogin.purgeDependencyOnElmtId(rmElmtId);
        this.__loading.purgeDependencyOnElmtId(rmElmtId);
        this.__errorMessage.purgeDependencyOnElmtId(rmElmtId);
        this.__externalAddress.purgeDependencyOnElmtId(rmElmtId);
        this.__internalAddress.purgeDependencyOnElmtId(rmElmtId);
        this.__username.purgeDependencyOnElmtId(rmElmtId);
        this.__password.purgeDependencyOnElmtId(rmElmtId);
        this.__confirmPassword.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__sourceType.aboutToBeDeleted();
        this.__isLogin.aboutToBeDeleted();
        this.__loading.aboutToBeDeleted();
        this.__errorMessage.aboutToBeDeleted();
        this.__externalAddress.aboutToBeDeleted();
        this.__internalAddress.aboutToBeDeleted();
        this.__username.aboutToBeDeleted();
        this.__password.aboutToBeDeleted();
        this.__confirmPassword.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __sourceType: ObservedPropertySimplePU<string>;
    get sourceType() {
        return this.__sourceType.get();
    }
    set sourceType(newValue: string) {
        this.__sourceType.set(newValue);
    }
    private __isLogin: ObservedPropertySimplePU<boolean>;
    get isLogin() {
        return this.__isLogin.get();
    }
    set isLogin(newValue: boolean) {
        this.__isLogin.set(newValue);
    }
    private __loading: ObservedPropertySimplePU<boolean>;
    get loading() {
        return this.__loading.get();
    }
    set loading(newValue: boolean) {
        this.__loading.set(newValue);
    }
    private __errorMessage: ObservedPropertySimplePU<string>;
    get errorMessage() {
        return this.__errorMessage.get();
    }
    set errorMessage(newValue: string) {
        this.__errorMessage.set(newValue);
    }
    private __externalAddress: ObservedPropertySimplePU<string>;
    get externalAddress() {
        return this.__externalAddress.get();
    }
    set externalAddress(newValue: string) {
        this.__externalAddress.set(newValue);
    }
    private __internalAddress: ObservedPropertySimplePU<string>;
    get internalAddress() {
        return this.__internalAddress.get();
    }
    set internalAddress(newValue: string) {
        this.__internalAddress.set(newValue);
    }
    private __username: ObservedPropertySimplePU<string>;
    get username() {
        return this.__username.get();
    }
    set username(newValue: string) {
        this.__username.set(newValue);
    }
    private __password: ObservedPropertySimplePU<string>;
    get password() {
        return this.__password.get();
    }
    set password(newValue: string) {
        this.__password.set(newValue);
    }
    private __confirmPassword: ObservedPropertySimplePU<string>;
    get confirmPassword() {
        return this.__confirmPassword.get();
    }
    set confirmPassword(newValue: string) {
        this.__confirmPassword.set(newValue);
    }
    private tipsMap: Record<string, string>;
    private defaultAddressMap: Record<string, string>;
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
        }
        catch (e) {
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
        }
        catch (e) {
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
                response = await loginApi(loginBody);
            }
            else {
                if (mappedType === 'subsonic') {
                    this.errorMessage = 'Subsonic 数据源不支持注册';
                    this.loading = false;
                    return;
                }
                const registerBody: Record<string, Object> = {};
                registerBody['username'] = this.username;
                registerBody['password'] = this.password;
                registerBody['deviceName'] = 'HarmonyOS';
                response = await registerApi(registerBody);
            }
            const res = response as Record<string, Object>;
            const code = res['code'] as number;
            if (code === 200 || code === 201) {
                const data = res['data'] as Record<string, Object>;
                let token: string | null = null;
                if (data['token']) {
                    token = data['token'] as string;
                }
                else if (data['accessToken']) {
                    token = data['accessToken'] as string;
                }
                if (token) {
                    httpClient.setToken(token);
                    await storage.setItem('token_' + bestAddress, token);
                }
                let user: Object | null = null;
                if (data['user']) {
                    user = data['user'] as Object;
                }
                else {
                    user = data;
                }
                if (user) {
                    const userStr = JSON.stringify(user);
                    await storage.setItem('user_' + bestAddress, userStr);
                    await storage.setItem('currentUser', userStr);
                }
                await storage.setItem('creds_' + this.sourceType + '_' + bestAddress, JSON.stringify({ username: this.username, password: this.password }));
                await storage.setItem('serverAddress', bestAddress);
                await storage.setItem('selectedSourceType', this.sourceType);
                router.replaceUrl({ url: 'pages/HomePage' });
            }
            else {
                const msg = res['message'] as string;
                this.errorMessage = msg || '登录失败';
            }
        }
        catch (error) {
            console.error('Login/Register error:', error);
            if (error instanceof Error) {
                this.errorMessage = error.message || '网络请求失败，请检查服务器地址';
            }
            else {
                this.errorMessage = '网络请求失败，请检查服务器地址';
            }
        }
        finally {
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
        }
        catch {
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
            existingConfigs.push(new SourceConfig(Date.now().toString(), this.internalAddress, this.externalAddress, '服务器 ' + (existingConfigs.length + 1)));
        }
        await storage.setItem(configKey, JSON.stringify(existingConfigs));
        await storage.setItem('serverAddress_' + this.sourceType, bestAddress);
    }
    FormInput(label: string, placeholder: string, text: string, onChange: (value: string) => void, isPassword: boolean = false, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(249:5)", "entry");
            Column.width('100%');
            Column.margin({ bottom: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(label);
            Text.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(250:7)", "entry");
            Text.fontSize(14);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor('#2c3e50');
            Text.margin({ bottom: 8 });
            Text.alignSelf(ItemAlign.Start);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ text: text, placeholder: placeholder });
            TextInput.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(257:7)", "entry");
            TextInput.type(isPassword ? InputType.Password : InputType.Normal);
            TextInput.height(48);
            TextInput.backgroundColor('#f8f9fa');
            TextInput.borderRadius(8);
            TextInput.padding({ left: 16, right: 16 });
            TextInput.fontSize(14);
            TextInput.onChange(onChange);
        }, TextInput);
        Column.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(271:5)", "entry");
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor('#ffffff');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(272:7)", "entry");
            Row.width('100%');
            Row.padding({ left: 16, right: 16, top: 16, bottom: 16 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('‹ 返回');
            Button.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(273:9)", "entry");
            Button.fontSize(14);
            Button.fontColor('#007DFF');
            Button.backgroundColor(Color.Transparent);
            Button.onClick(() => {
                router.back();
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.sourceType + (this.isLogin ? ' 登录' : ' 注册'));
            Text.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(281:9)", "entry");
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor('#2c3e50');
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
            Blank.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(286:9)", "entry");
        }, Blank);
        Blank.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.tipsMap[this.sourceType] || '');
            Text.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(291:7)", "entry");
            Text.fontSize(13);
            Text.fontColor('#95a5a6');
            Text.margin({ left: 16, right: 16, bottom: 24 });
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.errorMessage.length > 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.errorMessage);
                        Text.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(298:9)", "entry");
                        Text.fontSize(13);
                        Text.fontColor('#e74c3c');
                        Text.margin({ left: 16, right: 16, bottom: 16 });
                        Text.backgroundColor('#fdeaea');
                        Text.padding(12);
                        Text.borderRadius(8);
                        Text.width('100%');
                    }, Text);
                    Text.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Scroll.create();
            Scroll.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(308:7)", "entry");
            Scroll.layoutWeight(1);
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(309:9)", "entry");
            Column.width('100%');
            Column.padding({ left: 16, right: 16, bottom: 32 });
        }, Column);
        this.FormInput.bind(this)('外网地址', 'https://example.com', this.externalAddress, (val) => this.externalAddress = val);
        this.FormInput.bind(this)('内网地址', 'http://192.168.x.x:3000', this.internalAddress, (val) => this.internalAddress = val);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Divider.create();
            Divider.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(313:11)", "entry");
            Divider.margin({ top: 8, bottom: 24 });
            Divider.color('#ecf0f1');
        }, Divider);
        this.FormInput.bind(this)('用户名', '请输入用户名', this.username, (val) => this.username = val);
        this.FormInput.bind(this)('密码', '请输入密码', this.password, (val) => this.password = val, true);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (!this.isLogin) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.FormInput.bind(this)('确认密码', '请再次输入密码', this.confirmPassword, (val) => this.confirmPassword = val, true);
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel(this.loading ? '处理中...' : (this.isLogin ? '登录' : '注册'));
            Button.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(324:11)", "entry");
            Button.width('100%');
            Button.height(50);
            Button.backgroundColor(this.loading ? '#bdc3c7' : '#007DFF');
            Button.borderRadius(12);
            Button.fontSize(16);
            Button.fontWeight(FontWeight.Medium);
            Button.fontColor('#FFFFFF');
            Button.margin({ top: 24 });
            Button.enabled(!this.loading);
            Button.onClick(() => this.handleSubmit());
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel(this.isLogin ? '没有账号？去注册' : '已有账号？去登录');
            Button.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(336:11)", "entry");
            Button.width('100%');
            Button.height(44);
            Button.backgroundColor(Color.Transparent);
            Button.fontSize(14);
            Button.fontColor('#007DFF');
            Button.margin({ top: 16 });
            Button.onClick(() => {
                this.isLogin = !this.isLogin;
                this.errorMessage = '';
            });
        }, Button);
        Button.pop();
        Column.pop();
        Scroll.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "LoginPage";
    }
}
registerNamedRoute(() => new LoginPage(undefined, {}), "", { bundleName: "com.audiodock.harmony", moduleName: "entry", pagePath: "pages/LoginPage", pageFullPath: "products/entry/src/main/ets/pages/LoginPage", integratedHsp: "false", moduleType: "followWithHap" });
