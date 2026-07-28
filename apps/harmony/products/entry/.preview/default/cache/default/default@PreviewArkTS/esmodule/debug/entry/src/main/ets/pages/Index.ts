if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Index_Params {
}
import router from "@ohos:router";
import { authStore } from "@bundle:com.audiodock.harmony/entry/ets/context/AuthStore";
import hilog from "@ohos:hilog";
const DOMAIN = 0xA001;
const TAG = 'IndexRoute';
class Index extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: Index_Params) {
    }
    updateStateVars(params: Index_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
    }
    aboutToBeDeleted() {
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    async aboutToAppear(): Promise<void> {
        hilog.info(DOMAIN, TAG, '[1] aboutToAppear entered');
        try {
            await authStore.loadFromStorage();
            hilog.info(DOMAIN, TAG, `[2] loadFromStorage done user=${String(authStore.state_.user)} server=${authStore.state_.serverAddress}`);
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `[2] loadFromStorage THREW: ${String(e)}`);
        }
        setTimeout(() => {
            hilog.info(DOMAIN, TAG, '[3] setTimeout fired');
            let target = 'pages/SourceSelectPage';
            if (authStore.state_.user)
                target = 'pages/MainPage';
            else if (authStore.state_.serverAddress)
                target = 'pages/LoginPage';
            hilog.info(DOMAIN, TAG, `[4] navigating to ${target}`);
            router.replaceUrl({ url: target }).then(() => {
                hilog.info(DOMAIN, TAG, `[5] replaceUrl resolved for ${target}`);
            }).catch((e: Error) => {
                hilog.error(DOMAIN, TAG, `[5] replaceUrl REJECTED for ${target}: ${e.message}`);
            });
        }, 0);
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/Index.ets(35:5)", "entry");
            Column.width('100%');
            Column.height('100%');
            Column.justifyContent(FlexAlign.Center);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('AudioDock');
            Text.debugLine("products/entry/src/main/ets/pages/Index.ets(35:16)", "entry");
            Text.fontSize(28);
            Text.fontWeight(700);
        }, Text);
        Text.pop();
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
