[OPEN] wechat-pay-null

# 背景
- 现象：`mobile` Android 微信支付报错 `TypeError: Cannot read property 'registerApp' of null`
- 影响：会员页发起微信支付时在 JS 侧提前崩溃，无法走到原生支付

# 假设
1. 原生微信模块没有被注册到 React Native
2. Android 原生代码已注册，但第三方 JS 包装层读取了错误的模块名
3. `appId` 或支付参数缺失，导致 `registerApp` 调用失败
4. 支付回调 Activity 缺失，导致支付流程无法完成

# 证据
- `react-native-wechat-lib` Android 原生模块名是 `RCTWeChat`，见 `WeChatModule#getName()`
- 同库 JS 入口在顶层直接执行 `const { WeChat } = NativeModules`，随后 `wrapRegisterApp(WeChat.registerApp)`，当 `NativeModules.WeChat` 不存在时会在模块加载阶段直接抛错
- 用户最新运行时堆栈显示异常发生在 `loadWeChatModule -> getWeChatModule -> ensureWeChatRegistered`，与上述入口代码一致
- 已补齐 Android 原生 `WeChatPackage` / `WXEntryActivity` / `WXPayEntryActivity` 后问题仍存在，进一步排除“仅原生未接入”的单一原因

# 结论
- 确认根因：第三方包 `react-native-wechat-lib` 的 JS 包装层与当前环境下实际暴露的原生模块名不一致
- 最小修复：业务侧不再 `require('react-native-wechat-lib')`，改为直接读取 `NativeModules.RCTWeChat` 并自行封装 `registerApp` / `pay`

# 当前修复
- 文件：`apps/mobile/src/services/payments.ts`
- 说明：绕过第三方 JS 包装层，直接调用 `RCTWeChat`

# 待验证
- 重新安装 Android 包后再次发起微信支付
- 观察是否还出现 `registerApp of null`
