if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface SourceSelectPage_Params {
    sourceList?: SourceItem[];
    selectedSource?: string;
}
import router from "@ohos:router";
interface SourceItem {
    key: string;
    name: string;
    desc: string;
    iconColor: string;
}
class SourceSelectPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__sourceList = new ObservedPropertyObjectPU([
            { key: 'AudioDock', name: 'AudioDock', desc: '自建 AudioDock 服务端', iconColor: '#007DFF' },
            { key: 'Subsonic', name: 'Subsonic', desc: '兼容 Subsonic/API 协议的音乐服务器', iconColor: '#FF6B35' },
            { key: 'Emby', name: 'Emby', desc: 'Emby 媒体服务器', iconColor: '#52B54B' }
        ], this, "sourceList");
        this.__selectedSource = new ObservedPropertySimplePU('', this, "selectedSource");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: SourceSelectPage_Params) {
        if (params.sourceList !== undefined) {
            this.sourceList = params.sourceList;
        }
        if (params.selectedSource !== undefined) {
            this.selectedSource = params.selectedSource;
        }
    }
    updateStateVars(params: SourceSelectPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__sourceList.purgeDependencyOnElmtId(rmElmtId);
        this.__selectedSource.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__sourceList.aboutToBeDeleted();
        this.__selectedSource.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __sourceList: ObservedPropertyObjectPU<SourceItem[]>;
    get sourceList() {
        return this.__sourceList.get();
    }
    set sourceList(newValue: SourceItem[]) {
        this.__sourceList.set(newValue);
    }
    private __selectedSource: ObservedPropertySimplePU<string>;
    get selectedSource() {
        return this.__selectedSource.get();
    }
    set selectedSource(newValue: string) {
        this.__selectedSource.set(newValue);
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(22:5)", "entry");
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor('#ffffff');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // Header
            Row.create();
            Row.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(24:7)", "entry");
            // Header
            Row.width('100%');
            // Header
            Row.padding({ top: 16, bottom: 16 });
            // Header
            Row.justifyContent(FlexAlign.Center);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('选择数据源');
            Text.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(25:9)", "entry");
            Text.fontSize(24);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor('#2c3e50');
        }, Text);
        Text.pop();
        // Header
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('请选择您的音乐服务器类型');
            Text.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(34:7)", "entry");
            Text.fontSize(14);
            Text.fontColor('#95a5a6');
            Text.margin({ bottom: 24 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // Source List
            List.create();
            List.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(40:7)", "entry");
            // Source List
            List.listDirection(Axis.Vertical);
            // Source List
            List.padding({ left: 16, right: 16 });
            // Source List
            List.layoutWeight(1);
        }, List);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = _item => {
                const item = _item;
                {
                    const itemCreation = (elmtId, isInitialRender) => {
                        ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                        ListItem.create(deepRenderFunction, true);
                        if (!isInitialRender) {
                            ListItem.pop();
                        }
                        ViewStackProcessor.StopGetAccessRecording();
                    };
                    const itemCreation2 = (elmtId, isInitialRender) => {
                        ListItem.create(deepRenderFunction, true);
                        ListItem.margin({ bottom: 12 });
                        ListItem.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(42:11)", "entry");
                    };
                    const deepRenderFunction = (elmtId, isInitialRender) => {
                        itemCreation(elmtId, isInitialRender);
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Row.create();
                            Row.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(43:13)", "entry");
                            Row.width('100%');
                            Row.padding(16);
                            Row.backgroundColor('#f8f9fa');
                            Row.borderRadius(12);
                            Row.onClick(() => {
                                router.pushUrl({
                                    url: 'pages/LoginPage',
                                    params: { sourceType: item.key }
                                });
                            });
                        }, Row);
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            // Icon placeholder
                            Column.create();
                            Column.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(45:15)", "entry");
                            // Icon placeholder
                            Column.width(50);
                            // Icon placeholder
                            Column.height(50);
                            // Icon placeholder
                            Column.borderRadius(12);
                            // Icon placeholder
                            Column.backgroundColor(item.iconColor);
                            // Icon placeholder
                            Column.justifyContent(FlexAlign.Center);
                        }, Column);
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Text.create(item.name.substring(0, 1));
                            Text.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(46:17)", "entry");
                            Text.fontSize(24);
                            Text.fontColor('#FFFFFF');
                            Text.fontWeight(FontWeight.Bold);
                        }, Text);
                        Text.pop();
                        // Icon placeholder
                        Column.pop();
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Column.create();
                            Column.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(57:15)", "entry");
                            Column.layoutWeight(1);
                            Column.margin({ left: 16 });
                            Column.alignItems(HorizontalAlign.Start);
                        }, Column);
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Text.create(item.name);
                            Text.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(58:17)", "entry");
                            Text.fontSize(18);
                            Text.fontWeight(FontWeight.Medium);
                            Text.fontColor('#2c3e50');
                        }, Text);
                        Text.pop();
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Text.create(item.desc);
                            Text.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(63:17)", "entry");
                            Text.fontSize(12);
                            Text.fontColor('#95a5a6');
                            Text.margin({ top: 4 });
                            Text.maxLines(2);
                            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                        }, Text);
                        Text.pop();
                        Column.pop();
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Text.create('›');
                            Text.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(74:15)", "entry");
                            Text.fontSize(24);
                            Text.fontColor('#bdc3c7');
                        }, Text);
                        Text.pop();
                        Row.pop();
                        ListItem.pop();
                    };
                    this.observeComponentCreation2(itemCreation2, ListItem);
                    ListItem.pop();
                }
            };
            this.forEachUpdateFunction(elmtId, this.sourceList, forEachItemGenFunction);
        }, ForEach);
        ForEach.pop();
        // Source List
        List.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // Bottom info
            Text.create('AudioDock HarmonyOS');
            Text.debugLine("products/entry/src/main/ets/pages/SourceSelectPage.ets(97:7)", "entry");
            // Bottom info
            Text.fontSize(12);
            // Bottom info
            Text.fontColor('#bdc3c7');
            // Bottom info
            Text.margin({ bottom: 24 });
        }, Text);
        // Bottom info
        Text.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "SourceSelectPage";
    }
}
registerNamedRoute(() => new SourceSelectPage(undefined, {}), "", { bundleName: "com.audiodock.harmony", moduleName: "entry", pagePath: "pages/SourceSelectPage", pageFullPath: "products/entry/src/main/ets/pages/SourceSelectPage", integratedHsp: "false", moduleType: "followWithHap" });
