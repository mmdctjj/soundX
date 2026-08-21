import { bundleManager } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { Logger } from '../logger/Logger';

const TAG = 'BundleInfo';

/** 应用版本信息接口 */
interface AppVersionInfo {
  versionName: string;
  versionCode: number;
}

const DEFAULT_FLAGS =
  bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_APPLICATION |
  bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_HAP_MODULE |
  bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_REQUESTED_PERMISSION |
  bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_SIGNATURE_INFO;

/**
 * 异步获取当前应用自身的 BundleInfo。
 * 内部使用 Promise 包装 bundleManager.getBundleInfoForSelf，
 * 捕获同步 / 异步错误并以 reject 形式抛出 BusinessError。
 *
 * @param bundleFlags 取值见 {@link bundleManager.BundleFlag}，默认含 appInfo / hapModuleInfo / permission / signature。
 */
export function getSelfBundleInfo(
  bundleFlags: number = DEFAULT_FLAGS
): Promise<bundleManager.BundleInfo> {
  return new Promise((resolve, reject) => {
    try {
      bundleManager.getBundleInfoForSelf(bundleFlags)
        .then((data: bundleManager.BundleInfo) => {
          Logger.i(TAG, 'getSelfBundleInfo success');
          resolve(data);
        })
        .catch((err: BusinessError) => {
          Logger.e(TAG, `getSelfBundleInfo failed: ${err.message}`);
          reject(err);
        });
    } catch (err) {
      const e = err as BusinessError;
      Logger.e(TAG, `getSelfBundleInfo sync throw: ${e.message}`);
      reject(e);
    }
  });
}

/** 便捷取版本号 / 版本名（仅需要 DEFAULT flag）。 */
export async function getSelfAppVersion(): Promise<AppVersionInfo> {
  const info = await getSelfBundleInfo(bundleManager.BundleFlag.GET_BUNDLE_INFO_DEFAULT);
  const result: AppVersionInfo = { versionName: info.versionName, versionCode: info.versionCode };
  return result;
}

/** 便捷取签名信息。 */
export async function getSelfSignatureInfo(): Promise<bundleManager.SignatureInfo | undefined> {
  const info = await getSelfBundleInfo(
    bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_SIGNATURE_INFO
  );
  return info.signatureInfo;
}

/** 便捷取已请求的权限列表。 */
export async function getSelfRequestedPermissions(): Promise<string[]> {
  const info = await getSelfBundleInfo(
    bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_REQUESTED_PERMISSION
  );
  const list = (info.reqPermissionDetails ?? []).map((d) => d.name);
  return list;
}
