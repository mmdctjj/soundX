---
name: harmony-toggle-ghost
description: 鸿蒙 ArkUI 设置页开关（Toggle/自绘 Switch）"无法点击 / 状态与存储对不上"的根治方案。适用于 AudioDock 项目 harmony 端（apps/harmony）任何带开关的页面。
---

# HarmonyOS 设置页开关失灵根治

## 症状
设置页/任何带 Switch 的页面，两类症状并存：
1. 用户开启开关后退出再进，开关显示关闭；或切换主题后开关被重置（存储里的真实值被覆盖成 false）。
2. 修复 1 之后，开关彻底点不动（无点击反馈、无视觉变化）。

## 根因（三层）
- **层 1（状态被覆盖）**：ArkUI 的 `Toggle({ type: ToggleType.Switch, isOn: value })` 在 `isOn` 绑定的 @State 变化触发重建时，会**误发一次 `onChange(false)`**（本仓库 commit `1c419826` 已证实）。handler 无条件写存储，真实值就被覆盖。
- **层 2（点击失效）**：开关放在**局部 @Builder**（如 `this.SwitchRow(...)`）里，且开关外观依赖父组件的 @State。@Builder 按值内联展开，@State 变化 → 父 build 重跑 → Builder 子树销毁重建，其内部节点的手势注册在重建链路上不稳定。
- **层 3（状态不同步，真机日志实锤）**：即使抽成独立 @Component，**开关值用 `@Prop` 传递也会断**——@Prop 是深拷贝，父 @State 变了但子组件 onClick 里读到的 `this.value` 永远是旧值，导致每次点击都翻转同一个 false → 永远写 true → UI 不动。日志特征：`tap label=xx value=false` 刷屏、`handleXxx -> true` 每次都打，但开关视觉不变。**必须用 `@Link` 双向绑定。**

## 不要用的方案（本项目实测全部踩过）
1. **计时窗口**：loadSettings 后 N ms 内忽略 onChange——异步回填时机不受控，重建落在窗口外就失效。
2. **onClick 信号**：在 Toggle 上叠 `.onClick(() => userTouched = true)`，onChange 里检查信号——Switch 型 Toggle 的 onClick 与 onChange 触发顺序不可控，真实点击被当鬼影吞掉。
3. **受控 Toggle + 透明热区**（Stack 叠 onClick Column）：
   - 给 Toggle 加 `.enabled(false)` → 禁用整个子树手势，热区被连累，所有开关点不动。
   - 给 Toggle 加 `.hitTestBehavior(HitTestMode.None)` → 同样连累热区。
4. **自绘开关留在 @Builder 里**：绕开了 Toggle 组件但没绕开 @Builder 重建问题，点击依然无响应。
5. **独立 @Component 但开关值用 @Prop**：点击和回调都通了，但 @Prop 深拷贝导致子组件读不到父 @State 的最新值，每次点击都翻转同一个旧值，UI 不动。**开关值必须 @Link。**

## 推荐方案：独立 @Component + @Link 双向绑定 + 自绘开关

**三个动作缺一不可**：
1. 从 @Builder 里搬出来，做成文件级独立 @Component；
2. **开关值用 `@Link`（不是 @Prop）双向绑定父组件 @State**——@Prop 深拷贝会导致子组件永远读到旧值；
3. 不用 Toggle 组件，自绘轨道 + 滑块。

```typescript
// 文件级（@Entry 之前）
@Component
struct SettingSwitchRow {
  label: string = '';
  description: string = '';
  // 双向绑定父组件 @State。@Prop 在此场景更新链断裂（父 @State 已变，
  // 子组件 onClick 里读到的 value 永远是旧值），@Link 共享同一状态源。
  @Link value: boolean;
  @Prop disabled: boolean = false;
  onChange: (val: boolean) => void = () => {};

  // 主题需要自带 @StorageLink 监听（子组件收不到父级的主题对象传递）
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @State theme: Theme = buildTheme('light');
  aboutToAppear() { this.theme = buildTheme(this.themeMode); }
  onThemeModeChange(): void { this.theme = buildTheme(this.themeMode); }

  build() {
    Row() {
      Column() {
        Text(this.label).fontSize(17).fontWeight(FontWeight.Medium)
          .fontColor(this.theme.colors.text).margin({ bottom: 4 })
        Text(this.description).fontSize(13).fontColor(this.theme.colors.textSecondary)
      }
      .layoutWeight(1).alignItems(HorizontalAlign.Start).margin({ right: 20 })

      // 自绘 iOS 风格开关，点击即反转；不注册 Toggle onChange，从根上杜绝鬼影
      Column() {
        Column()
          .width(24).height(24).borderRadius(12)
          .backgroundColor('#f4f3f4')
          .translate({ x: this.value ? 12 : -12 })
          .animation({ duration: 200, curve: Curve.EaseInOut })
      }
      .width(48).height(28).borderRadius(14)
      .backgroundColor(this.value ? this.theme.colors.primary : 'rgba(120,120,128,0.32)')
      .justifyContent(FlexAlign.Center)
      .opacity(this.disabled ? 0.5 : 1)
      .onClick((): void => {
        if (!this.disabled) {
          this.onChange(!this.value);
        }
      })
    }
    .width('100%')
    .padding({ top: 15, bottom: 15 })
    .borderWidth({ bottom: 0.5 })
    .borderColor(this.theme.colors.border)
  }
}
```

父页面调用处把 `this.SwitchRow(...)` 换成组件调用：

```typescript
SettingSwitchRow({
  label: t('settings.voiceAssistant'),
  description: t('settings.voiceAssistantDescription'),
  value: this.voiceAssistantEnabled,
  disabled: false,
  onChange: (val: boolean): void => this.handleVoiceAssistantChange(val),
})
```

handler 直接写存储即可，**无需任何计时守卫**。

### 派生表达式开关（dark/festive 主题）的例外
`themeMode === 'dark'` 这类开关没有对应的父 @State 字段可供 @Link 反向写入，不能用 SettingSwitchRow。用「单向回显 + 回调写源」的局部 @Builder：回显值由父表达式计算后传入，点击只调 handler 写 themeMode，themeMode 变化 → 表达式重算 → 新值传回完成闭环。

### 调用处不能用中间层 @Builder 转发
`@Builder SwitchRow(label, desc, value, onChange)` 的参数 `value` 是按值传递的裸 boolean，@Link 无法穿透绑定到父 @State。调用处必须**直接组件调用** `SettingSwitchRow({ value: this.xxxEnabled, ... })`，不能再包一层 `this.SwitchRow(...)`。

### 为什么这个方案可靠
- 独立 @Component 拥有稳定实例：@Link 变化只触发**属性级 diff 更新**（改颜色/translate），子树不会被销毁重建，手势识别器持续有效。
- @Link 双向绑定 → 子组件 onClick 里读到的 `this.value` 就是父 @State 的实时值。
- 不用 Toggle 组件 → 不存在 isOn 重建误发 onChange 的通道。

## 构建验证
```bash
cd apps/harmony && \
DEVECO_SDK_HOME=/Applications/DevEco-Studio.app/Contents/sdk \
/Applications/DevEco-Studio.app/Contents/tools/hvigor/bin/hvigorw assembleHap --no-daemon
```
（`~/Library/OpenHarmony/Sdk` 只有 12/20，项目要求 22，必须用 DevEco 内置 SDK；shell 残留的 DEVECO_SDK_HOME 会干扰，要显式覆盖。）

## 教训沉淀
- **可交互控件（开关、热区、手势区）不要放进局部 @Builder**——@Builder 适合纯展示片段（标题、分隔线、只读行），一旦内部节点要响应点击且外观依赖 @State，就该抽成独立 @Component。
- 修"状态对不上"这类问题时，别把精力花在过滤鬼影事件上（计时器、信号量都不可靠），直接掐断鬼影产生的通道（不用 Toggle 的 onChange）。
