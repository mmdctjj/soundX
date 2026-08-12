import { common } from '@kit.AbilityKit';
import Want from '@ohos.app.ability.Want';
import { Logger } from 'audiodock_common';
// 鸿蒙 OHPM 包：@tencent/wechat_open_sdk
// 资源下载：https://developers.weixin.qq.com/doc/oplatform/Mobile_App/Downloads/HarmonyOS_Resource.html
// 依赖已在 products/entry/oh-package.json5 声明（@tencent/wechat_open_sdk: 1.0.19），
// 改代码前需执行 ohpm install 拉取依赖。
import * as wxopensdk from '@tencent/wechat_open_sdk';
import type { WechatPayPayload } from 'features_network';

const TAG = 'WechatPay';

/**
 * 微信支付 OpenHarmony SDK 封装。
 *
 * 设计要点：
 * 1. AppID 在 WXAPIFactory.createWXAPI(appId) 时即完成注册，整个 app 生命周期复用同一实例。
 * 2. 调起支付用 WXApi.sendReq(context, req)，返回值仅表示"是否成功拉起微信 app"，
 *    不是支付结果——支付结果由 WXApiEventHandler.onResp 回调触发。
 * 3. 回调有 3 种分支：errCode === 0（成功）/ -2（用户取消）/ 其它（错误：签名错、未注册等）。
 * 4. 单实例、串行支付：pendingResolve 持有当前进行中的 Promise，避免并发支付时回调错位。
 * 5. WXApi.handleWant(want, handler) 必须在 EntryAbility.onCreate / onNewWant 中调用，
 *    微信通过 scheme `wx<appid>://platformId=wechat` 回跳时把回调数据带回来。
 */

export interface WechatPayResultSuccess {
  kind: 'success';
}

export interface WechatPayResultCancelled {
  kind: 'cancelled';
}

export interface WechatPayResultFailed {
  kind: 'failed';
  errCode: number;
  errMsg?: string;
}

export type WechatPayResult = WechatPayResultSuccess | WechatPayResultCancelled | WechatPayResultFailed;

let wxApi: wxopensdk.WXApi | null = null;
let pendingResolve: ((r: WechatPayResult) => void) | null = null;
let pendingTimeoutId: number | null = null;

const CALLBACK_TIMEOUT_MS = 90_000;

type OnWXResp = (resp: wxopensdk.BaseResp) => void;

/**
 * 微信事件回调分发器：SDK 的 onResp 是全局单点，这里用 Set 支持多订阅方，
 * 当前只有支付一个订阅者。
 */
class WXApiEventHandlerImpl implements wxopensdk.WXApiEventHandler {
  private respCallbacks: Set<OnWXResp> = new Set();

  registerOnWXRespCallback(cb: OnWXResp): void {
    this.respCallbacks.add(cb);
  }

  unregisterOnWXRespCallback(cb: OnWXResp): void {
    this.respCallbacks.delete(cb);
  }

  onReq(req: wxopensdk.BaseReq): void {
    Logger.i(TAG, `onReq: ${JSON.stringify(req)}`);
  }

  onResp(resp: wxopensdk.BaseResp): void {
    Logger.i(TAG, `onResp: ${JSON.stringify(resp)}`);
    this.respCallbacks.forEach((cb) => {
      cb(resp);
    });
  }
}

const wxEventHandler = new WXApiEventHandlerImpl();

/**
 * 注册 AppID。EntryAbility.onCreate 调用一次即可。
 * 内部通过 WXAPIFactory.createWXAPI 创建全局 WXApi 实例，幂等。
 */
export function registerWechatApp(appId: string): void {
  if (wxApi) return;
  try {
    wxApi = wxopensdk.WXAPIFactory.createWXAPI(appId);
    Logger.i(TAG, `registered appId=${appId}`);
  } catch (e) {
    Logger.e(TAG, `registerWechatApp failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * 检测是否安装了微信 app。
 */
export function isWeChatInstalled(): boolean {
  if (!wxApi) return false;
  try {
    return wxApi.isWXAppInstalled();
  } catch (e) {
    Logger.w(TAG, `isWeChatInstalled failed: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

/**
 * 安装全局 BaseResp 回调（EntryAbility 启动时调用一次）。
 * 微信 SDK 把回调集中在一个全局 onResp 里，靠 resp.errCode 区分结果。
 */
export function installWechatRespHandler(): void {
  try {
    wxEventHandler.registerOnWXRespCallback((resp: wxopensdk.BaseResp) => {
      if (!pendingResolve) {
        Logger.w(TAG, 'onResp fired but no pending pay promise');
        return;
      }
      const resolve = pendingResolve;
      pendingResolve = null;
      clearPendingTimeout();

      const code = typeof resp.errCode === 'number' ? resp.errCode : -1;
      let result: WechatPayResult;
      if (code === 0) {
        const successResult: WechatPayResultSuccess = { kind: 'success' };
        result = successResult;
      } else if (code === -2) {
        const cancelledResult: WechatPayResultCancelled = { kind: 'cancelled' };
        result = cancelledResult;
      } else {
        const failedResult: WechatPayResultFailed = {
          kind: 'failed',
          errCode: code,
          errMsg: typeof resp.errStr === 'string' ? resp.errStr : '',
        };
        result = failedResult;
      }
      resolve(result);
    });
    Logger.i(TAG, 'installWechatRespHandler done');
  } catch (e) {
    Logger.e(TAG, `installWechatRespHandler failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * 让 EntryAbility.onCreate / onNewWant 把 want 透传给 SDK，触发内部回调。
 * 微信完成支付后通过 scheme 回跳本 Ability，必须在这里把 want 交给 SDK 解析。
 */
export function handleWechatWant(want: Want): boolean {
  if (!wxApi) {
    Logger.w(TAG, 'handleWechatWant called before registerWechatApp');
    return false;
  }
  try {
    return wxApi.handleWant(want, wxEventHandler);
  } catch (e) {
    Logger.w(TAG, `handleWant failed: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

/**
 * 调起微信支付。
 *
 * @returns WechatPayResult: success / cancelled / failed（如果 sendReq 直接报错或回调超时）
 */
export async function payWithWeChat(
  context: common.UIAbilityContext,
  payload: WechatPayPayload,
): Promise<WechatPayResult> {
  // 防并发：当前已有支付在进行中
  if (pendingResolve) {
    Logger.w(TAG, 'a pay is already in progress, rejecting');
    const failedResult: WechatPayResultFailed = { kind: 'failed', errCode: -3, errMsg: '并发支付被拦截' };
    return failedResult;
  }
  if (!wxApi) {
    const failedResult: WechatPayResultFailed = { kind: 'failed', errCode: -8, errMsg: '微信 SDK 未初始化' };
    return failedResult;
  }
  if (!isWeChatInstalled()) {
    const failedResult: WechatPayResultFailed = { kind: 'failed', errCode: -4, errMsg: '未安装微信' };
    return failedResult;
  }

  const req = buildPayReq(payload);

  return new Promise<WechatPayResult>((resolve) => {
    pendingResolve = resolve;
    // 回调兜底超时：90s 内 onResp 没回来就当失败，避免 pendingResolve 永远占位
    const timeoutId = setTimeout(() => {
      if (pendingResolve === resolve) {
        Logger.w(TAG, `pay callback timeout after ${CALLBACK_TIMEOUT_MS}ms`);
        pendingResolve = null;
        pendingTimeoutId = null;
        const failedResult: WechatPayResultFailed = { kind: 'failed', errCode: -5, errMsg: '回调超时' };
        resolve(failedResult);
      }
    }, CALLBACK_TIMEOUT_MS);
    pendingTimeoutId = timeoutId;

    // sendReq 类型是 SendReqResultWrap = boolean | Promise<boolean>，不同 SDK 版本行为不同，统一包成 Promise 处理
    Promise.resolve(wxApi!.sendReq(context, req))
      .then((launched: boolean) => {
        if (!launched) {
          // sendReq 返回 false：拉起微信失败（极少见），直接走失败分支
          if (pendingResolve === resolve) {
            pendingResolve = null;
            clearPendingTimeout();
            const failedResult: WechatPayResultFailed = { kind: 'failed', errCode: -6, errMsg: '拉起微信失败' };
            resolve(failedResult);
          }
        }
        // 成功拉起时不要 resolve，等 onResp 回调
      })
      .catch((e: Error) => {
        Logger.e(TAG, `sendReq threw: ${e.message}`);
        if (pendingResolve === resolve) {
          pendingResolve = null;
          clearPendingTimeout();
          const failedResult: WechatPayResultFailed = { kind: 'failed', errCode: -7, errMsg: e.message };
          resolve(failedResult);
        }
      });
  });
}

function buildPayReq(payload: WechatPayPayload): wxopensdk.PayReq {
  // SDK 字段映射：mobile 的 wechatPay.payload → wxopensdk.PayReq
  // 注意：mobile 用的字段名是 `package`，鸿蒙 SDK 用 `packageValue`。
  const req = new wxopensdk.PayReq();
  req.appId = payload.appId;
  req.partnerId = payload.partnerId;
  req.prepayId = payload.prepayId;
  req.nonceStr = payload.nonceStr;
  req.timeStamp = payload.timeStamp;
  req.packageValue = payload.package ?? 'Sign=WXPay';
  req.sign = payload.sign;
  // extData 是可选的扩展字段，回调时会原样带回；这里留空
  req.extData = '';
  return req;
}

function clearPendingTimeout(): void {
  if (pendingTimeoutId !== null) {
    clearTimeout(pendingTimeoutId);
    pendingTimeoutId = null;
  }
}
