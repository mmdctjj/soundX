if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Index_Params {
    message?: string;
}
import router from "@ohos:router";
class Index extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__message = new ObservedPropertySimplePU('Hello World', this, "message");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: Index_Params) {
        if (params.message !== undefined) {
            this.message = params.message;
        }
    }
    updateStateVars(params: Index_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__message.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__message.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __message: ObservedPropertySimplePU<string>;
    get message() {
        return this.__message.get();
    }
    set message(newValue: string) {
        this.__message.set(newValue);
    }
    navigateToSourceSelect() {
        router.pushUrl({ url: 'pages/SourceSelectPage' });
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/Index.ets(13:5)", "entry");
            Column.width('100%');
            Column.height('100%');
            Column.justifyContent(FlexAlign.Center);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.message);
            Text.debugLine("products/entry/src/main/ets/pages/Index.ets(14:7)", "entry");
            Text.fontSize(50);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor('#2c3e50');
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('AudioDock on HarmonyOS');
            Text.debugLine("products/entry/src/main/ets/pages/Index.ets(19:7)", "entry");
            Text.fontSize(16);
            Text.fontColor('#95a5a6');
            Text.margin({ top: 12 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('进入首页');
            Button.debugLine("products/entry/src/main/ets/pages/Index.ets(24:7)", "entry");
            Button.width('60%');
            Button.height(48);
            Button.backgroundColor('#52B54B');
            Button.borderRadius(12);
            Button.fontSize(16);
            Button.fontWeight(FontWeight.Medium);
            Button.fontColor('#FFFFFF');
            Button.margin({ top: 16 });
            Button.onClick(() => {
                router.pushUrl({ url: 'pages/HomePage' });
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('选择数据源');
            Button.debugLine("products/entry/src/main/ets/pages/Index.ets(37:7)", "entry");
            Button.width('60%');
            Button.height(48);
            Button.backgroundColor('#007DFF');
            Button.borderRadius(12);
            Button.fontSize(16);
            Button.fontWeight(FontWeight.Medium);
            Button.fontColor('#FFFFFF');
            Button.margin({ top: 12 });
            Button.onClick(() => this.navigateToSourceSelect());
        }, Button);
        Button.pop();
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
