if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface LoginPage_Params {
    username?: string;
    password?: string;
    errorMsg?: string;
    loading?: boolean;
    theme?: Theme;
}
import router from "@ohos:router";
import { buildTheme, CommonNavBar, CommonButton, type Theme } from "@bundle:com.audiodock.harmony/entry@features_ui/Index";
import { t } from "@bundle:com.audiodock.harmony/entry@features_i18n/Index";
import { HttpError } from "@bundle:com.audiodock.harmony/entry@features_network/Index";
import { authStore } from "@bundle:com.audiodock.harmony/entry/ets/context/AuthStore";
class LoginPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__username = new ObservedPropertySimplePU('', this, "username");
        this.__password = new ObservedPropertySimplePU('', this, "password");
        this.__errorMsg = new ObservedPropertySimplePU('', this, "errorMsg");
        this.__loading = new ObservedPropertySimplePU(false, this, "loading");
        this.theme = buildTheme('light');
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: LoginPage_Params) {
        if (params.username !== undefined) {
            this.username = params.username;
        }
        if (params.password !== undefined) {
            this.password = params.password;
        }
        if (params.errorMsg !== undefined) {
            this.errorMsg = params.errorMsg;
        }
        if (params.loading !== undefined) {
            this.loading = params.loading;
        }
        if (params.theme !== undefined) {
            this.theme = params.theme;
        }
    }
    updateStateVars(params: LoginPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__username.purgeDependencyOnElmtId(rmElmtId);
        this.__password.purgeDependencyOnElmtId(rmElmtId);
        this.__errorMsg.purgeDependencyOnElmtId(rmElmtId);
        this.__loading.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__username.aboutToBeDeleted();
        this.__password.aboutToBeDeleted();
        this.__errorMsg.aboutToBeDeleted();
        this.__loading.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
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
    private __errorMsg: ObservedPropertySimplePU<string>;
    get errorMsg() {
        return this.__errorMsg.get();
    }
    set errorMsg(newValue: string) {
        this.__errorMsg.set(newValue);
    }
    private __loading: ObservedPropertySimplePU<boolean>;
    get loading() {
        return this.__loading.get();
    }
    set loading(newValue: boolean) {
        this.__loading.set(newValue);
    }
    private theme: Theme;
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(17:5)", "entry");
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor(this.theme.colors.background);
        }, Column);
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new CommonNavBar(this, {
                        title: t('login.title'),
                        theme: this.theme,
                        onBack: (): void => { router.back(); },
                    }, undefined, elmtId, () => { }, { page: "products/entry/src/main/ets/pages/LoginPage.ets", line: 18, col: 7 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            title: t('login.title'),
                            theme: this.theme,
                            onBack: (): void => { router.back(); }
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        title: t('login.title'),
                        theme: this.theme
                    });
                }
            }, { name: "CommonNavBar" });
        }
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create({ space: 16 });
            Column.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(23:7)", "entry");
            Column.padding(16);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('login.heading'));
            Text.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(24:9)", "entry");
            Text.fontSize(20);
            Text.fontWeight(600);
            Text.margin({ top: 24 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: t('login.username'), text: this.username });
            TextInput.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(25:9)", "entry");
            TextInput.onChange((v: string): void => { this.username = v; });
            TextInput.borderRadius(8);
            TextInput.padding(12);
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: t('login.password'), text: this.password });
            TextInput.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(28:9)", "entry");
            TextInput.onChange((v: string): void => { this.password = v; });
            TextInput.type(InputType.Password);
            TextInput.borderRadius(8);
            TextInput.padding(12);
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.errorMsg) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.errorMsg);
                        Text.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(32:28)", "entry");
                        Text.fontColor('#E53935');
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
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new CommonButton(this, {
                        label: this.loading ? t('common.loading') : t('common.login'),
                        theme: this.theme,
                        disabled: this.loading,
                        onClick: (): void => { this.doLogin(); },
                    }, undefined, elmtId, () => { }, { page: "products/entry/src/main/ets/pages/LoginPage.ets", line: 33, col: 9 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            label: this.loading ? t('common.loading') : t('common.login'),
                            theme: this.theme,
                            disabled: this.loading,
                            onClick: (): void => { this.doLogin(); }
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        label: this.loading ? t('common.loading') : t('common.login'),
                        theme: this.theme,
                        disabled: this.loading
                    });
                }
            }, { name: "CommonButton" });
        }
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('login.register_tip'));
            Text.debugLine("products/entry/src/main/ets/pages/LoginPage.ets(39:9)", "entry");
            Text.onClick((): void => { router.replaceUrl({ url: 'pages/SignUpPage' }); });
            Text.fontColor(this.theme.colors.primary);
        }, Text);
        Text.pop();
        Column.pop();
        Column.pop();
    }
    private async doLogin(): Promise<void> {
        this.loading = true;
        this.errorMsg = '';
        try {
            await authStore.login({ username: this.username, password: this.password });
            router.replaceUrl({ url: 'pages/MainPage' });
        }
        catch (e) {
            this.errorMsg = e instanceof HttpError ? e.message : String(e);
        }
        finally {
            this.loading = false;
        }
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "LoginPage";
    }
}
registerNamedRoute(() => new LoginPage(undefined, {}), "", { bundleName: "com.audiodock.harmony", moduleName: "entry", pagePath: "pages/LoginPage", pageFullPath: "products/entry/src/main/ets/pages/LoginPage", integratedHsp: "false", moduleType: "followWithHap" });
