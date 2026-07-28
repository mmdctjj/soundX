if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface SourceSelectPage_Params {
    serverUrl?: string;
    serverName?: string;
    theme?: Theme;
}
import router from "@ohos:router";
import { buildTheme, CommonNavBar, CommonButton, type Theme } from "@bundle:com.audiodock.harmony/entry@features_ui/Index";
import { t } from "@bundle:com.audiodock.harmony/entry@features_i18n/Index";
import { httpClient } from "@bundle:com.audiodock.harmony/entry@features_network/Index";
import { kvStore } from "@bundle:com.audiodock.harmony/entry@features_storage/Index";
class SourceSelectPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__serverUrl = new ObservedPropertySimplePU('', this, "serverUrl");
        this.__serverName = new ObservedPropertySimplePU('', this, "serverName");
        this.theme = buildTheme('light');
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: SourceSelectPage_Params) {
        if (params.serverUrl !== undefined) {
            this.serverUrl = params.serverUrl;
        }
        if (params.serverName !== undefined) {
            this.serverName = params.serverName;
        }
        if (params.theme !== undefined) {
            this.theme = params.theme;
        }
    }
    updateStateVars(params: SourceSelectPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__serverUrl.purgeDependencyOnElmtId(rmElmtId);
        this.__serverName.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__serverUrl.aboutToBeDeleted();
        this.__serverName.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __serverUrl: ObservedPropertySimplePU<string>;
    get serverUrl() {
        return this.__serverUrl.get();
    }
    set serverUrl(newValue: string) {
        this.__serverUrl.set(newValue);
    }
    private __serverName: ObservedPropertySimplePU<string>;
    get serverName() {
        return this.__serverName.get();
    }
    set serverName(newValue: string) {
        this.__serverName.set(newValue);
    }
    private theme: Theme;
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(15:5)", "entry");
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor(this.theme.colors.background);
        }, Column);
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new CommonNavBar(this, { title: t('source_select.title'), showBack: false, theme: this.theme }, undefined, elmtId, () => { }, { page: "products/entry/src/main/ets/pages/SourceSelectPage.ets", line: 16, col: 7 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            title: t('source_select.title'),
                            showBack: false,
                            theme: this.theme
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        title: t('source_select.title'), showBack: false, theme: this.theme
                    });
                }
            }, { name: "CommonNavBar" });
        }
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create({ space: 16 });
            Column.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(17:7)", "entry");
            Column.padding(16);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('source_select.heading'));
            Text.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(18:9)", "entry");
            Text.fontSize(20);
            Text.fontWeight(600);
            Text.margin({ top: 24 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: t('source_select.url_placeholder'), text: this.serverUrl });
            TextInput.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(19:9)", "entry");
            TextInput.onChange((v: string): void => { this.serverUrl = v; });
            TextInput.borderRadius(8);
            TextInput.padding(12);
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: t('source_select.name_placeholder'), text: this.serverName });
            TextInput.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(22:9)", "entry");
            TextInput.onChange((v: string): void => { this.serverName = v; });
            TextInput.borderRadius(8);
            TextInput.padding(12);
        }, TextInput);
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new CommonButton(this, {
                        label: t('common.next'),
                        theme: this.theme,
                        onButtonClick: (): void => { this.saveAndNext(); },
                    }, undefined, elmtId, () => { }, { page: "products/entry/src/main/ets/pages/SourceSelectPage.ets", line: 25, col: 9 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            label: t('common.next'),
                            theme: this.theme,
                            onButtonClick: (): void => { this.saveAndNext(); }
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        label: t('common.next'),
                        theme: this.theme
                    });
                }
            }, { name: "CommonButton" });
        }
        Column.pop();
        Column.pop();
    }
    private async saveAndNext(): Promise<void> {
        const url = this.serverUrl.trim();
        if (!url)
            return;
        await kvStore.set('serverAddress', url);
        httpClient.setBaseURL(url);
        router.replaceUrl({ url: 'pages/LoginPage' });
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "SourceSelectPage";
    }
}
registerNamedRoute(() => new SourceSelectPage(undefined, {}), "", { bundleName: "com.audiodock.harmony", moduleName: "entry", pagePath: "pages/SourceSelectPage", pageFullPath: "products/entry/src/main/ets/pages/SourceSelectPage", integratedHsp: "false", moduleType: "followWithHap" });
