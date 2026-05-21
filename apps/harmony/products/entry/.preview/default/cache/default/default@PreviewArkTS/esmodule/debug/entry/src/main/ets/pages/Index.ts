if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Index_Params {
    isLoading?: boolean;
    hasAuth?: boolean;
}
import router from "@ohos:router";
import { storage } from "@bundle:com.audiodock.harmony/entry/ets/utils/StorageManager";
import { httpClient } from "@bundle:com.audiodock.harmony/entry/ets/utils/HttpClient";
class Index extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__isLoading = new ObservedPropertySimplePU(true, this, "isLoading");
        this.__hasAuth = new ObservedPropertySimplePU(false, this, "hasAuth");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: Index_Params) {
        if (params.isLoading !== undefined) {
            this.isLoading = params.isLoading;
        }
        if (params.hasAuth !== undefined) {
            this.hasAuth = params.hasAuth;
        }
    }
    updateStateVars(params: Index_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__isLoading.purgeDependencyOnElmtId(rmElmtId);
        this.__hasAuth.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__isLoading.aboutToBeDeleted();
        this.__hasAuth.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __isLoading: ObservedPropertySimplePU<boolean>;
    get isLoading() {
        return this.__isLoading.get();
    }
    set isLoading(newValue: boolean) {
        this.__isLoading.set(newValue);
    }
    private __hasAuth: ObservedPropertySimplePU<boolean>;
    get hasAuth() {
        return this.__hasAuth.get();
    }
    set hasAuth(newValue: boolean) {
        this.__hasAuth.set(newValue);
    }
    aboutToAppear() {
        this.checkAuthStatus();
    }
    async checkAuthStatus() {
        try {
            const savedAddress = await storage.getItem('serverAddress');
            const savedToken = savedAddress ? await storage.getItem('token_' + savedAddress) : null;
            if (savedAddress && savedToken) {
                httpClient.setBaseURL(savedAddress);
                httpClient.setToken(savedToken);
                this.hasAuth = true;
                // 已登录，跳转到主页面
                router.replaceUrl({ url: 'pages/MainPage' });
            }
            else {
                // 未登录，跳转到数据源选择页
                router.replaceUrl({ url: 'pages/SourceSelectPage' });
            }
        }
        catch (e) {
            console.error('Failed to check auth:', e);
            router.replaceUrl({ url: 'pages/SourceSelectPage' });
        }
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/Index.ets(37:5)", "entry");
            Column.width('100%');
            Column.height('100%');
            Column.justifyContent(FlexAlign.Center);
            Column.backgroundColor('#ffffff');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('AudioDock');
            Text.debugLine("products/entry/src/main/ets/pages/Index.ets(38:7)", "entry");
            Text.fontSize(32);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor('#007DFF');
            Text.margin({ bottom: 16 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('正在加载...');
            Text.debugLine("products/entry/src/main/ets/pages/Index.ets(44:7)", "entry");
            Text.fontSize(14);
            Text.fontColor('#95a5a6');
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            LoadingProgress.create();
            LoadingProgress.debugLine("products/entry/src/main/ets/pages/Index.ets(48:7)", "entry");
            LoadingProgress.width(40);
            LoadingProgress.height(40);
            LoadingProgress.color('#007DFF');
            LoadingProgress.margin({ top: 24 });
        }, LoadingProgress);
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "Index";
    }
}
registerNamedRoute(() => new Index(undefined, {}), "", { bundleName: "com.audiodock.harmony", moduleName: "entry", pagePath: "pages/Index", pageFullPath: "products/entry/src/main/ets/pages/Index", integratedHsp: "false", moduleType: "followWithHap" });
