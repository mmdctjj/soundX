// /Users/ctjj/Documents/projects/AudioDock/apps/harmony/scripts/mock-bundle-info.mjs
// 模拟 bundleManager.getBundleInfoForSelf(flags) 在 HarmonyOS 真机/模拟器上的调用契约与返回值结构。
// 字段命名与类型均对齐 @kit.AbilityKit 的 bundleManager.BundleInfo / ApplicationInfo /
// HapModuleInfo / SignatureInfo（API 12）。

const BundleFlag = {
  GET_BUNDLE_INFO_DEFAULT: 0x00000000,
  GET_BUNDLE_INFO_WITH_APPLICATION: 0x00000001,
  GET_BUNDLE_INFO_WITH_HAP_MODULE: 0x00000002,
  GET_BUNDLE_INFO_WITH_ABILITY: 0x00000004,
  GET_BUNDLE_INFO_WITH_EXTENSION_ABILITY: 0x00000008,
  GET_BUNDLE_INFO_WITH_REQUESTED_PERMISSION: 0x00000010,
  GET_BUNDLE_INFO_WITH_METADATA: 0x00000020,
  GET_BUNDLE_INFO_WITH_SIGNATURE_INFO: 0x00000080,
};

class BusinessError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const fullBundleInfo = {
  name: 'com.audiodock.app',
  vendor: 'audiodock',
  versionCode: 1000200,
  versionName: '1.0.2',
  minCompatibleVersionCode: 1000000,
  targetVersionCode: 1000200,
  appInfo: {
    bundleName: 'com.audiodock.app',
    fingerprint: 'a1b2c3d4e5f6g7h8',
    appId: '57658802078532421',
    appName: '声仓',
    appNameId: 1,
    icon: '/data/storage/el1/bundle/entry/com.audiodock.app/icon.png',
    iconId: 16777218,
    installTime: 1717804800000,
    sandbox: 0,
    appDistributionType: 'app',
    appProvisionType: 'debug',
    systemApp: 0,
    removable: 1,
    accessTokenId: 1024358291235,
    bundleType: 0,
    description: '声仓 - AudioDock',
    descriptionId: 16777218,
    label: '声仓',
    labelId: 16777218,
    mode: 0,
    subMode: 0,
    debug: true,
    nativeLibraryDir: '/data/storage/el1/bundle/libs',
    signatureInfo: {
      appId: '57658802078532421',
      fingerprint: 'a1b2c3d4e5f6g7h8__sign',
      bundleName: 'com.audiodock.app',
      appIdentifier: 'com.audiodock.app',
      orgId: 'dev',
      signature: 'MIIDdTCCAl2gAwIBAgIEbNBQ+TANBgkqhkiG9w0BAQsFADCBkDELMAkGA1UEBhMCQ04x...',
    },
  },
  hapModulesInfo: [
    {
      name: 'entry',
      icon: '/data/storage/el1/bundle/entry/com.audiodock.app/entry/icon.png',
      iconId: 16777218,
      bundleName: 'com.audiodock.app',
      moduleName: 'entry',
      moduleNameId: 16777218,
      description: 'Main entry module',
      descriptionId: 16777218,
      mainElementName: 'EntryAbility',
      mainAbilityName: 'EntryAbility',
      installationFree: 0,
      hashValue: 'h4hE2WGfBycO/uF8jE+XBw==',
      type: 1,
      compileSdkType: 1,
      compileSdkVersion: '5.0.0(12)',
      buildToolsVersion: '5.0.0.100',
      valid: true,
      dependencies: [],
      deviceTypes: ['phone', 'tablet', '2in1'],
      extensionAbilityInfos: [],
      metadata: { name: '', value: '' },
      abilitiesInfo: [
        {
          bundleName: 'com.audiodock.app',
          name: 'EntryAbility',
          label: '声仓',
          labelId: 16777218,
          description: 'Entry ability',
          descriptionId: 16777218,
          icon: '/data/.../icon.png',
          iconId: 16777218,
          moduleName: 'entry',
          moduleNameId: 16777218,
          mainAbilityName: 'EntryAbility',
          isVisible: true,
          type: 0,
          subType: 0,
          orientation: 0,
          supportWindowMode: ['fullscreen'],
          priority: 0,
          permissions: [],
          metadata: { name: '', value: '' },
          enabled: true,
          readPermission: '',
          uriPermissionMode: 0,
        },
      ],
    },
  ],
  reqPermissionDetails: [
    { name: 'ohos.permission.INTERNET', grantMode: 0, label: '', labelId: 16777218, description: '', descriptionId: 16777218 },
    { name: 'ohos.permission.GET_NETWORK_INFO', grantMode: 0, label: '', labelId: 16777218, description: '', descriptionId: 16777218 },
    { name: 'ohos.permission.MEDIA_LOCATION', grantMode: 1, label: '', labelId: 16777218, description: '', descriptionId: 16777218 },
    { name: 'ohos.permission.READ_MEDIA', grantMode: 1, label: '', labelId: 16777218, description: '', descriptionId: 16777218 },
  ],
  permissionGrantStates: [0, 0, 1, 0],
  signatureInfo: {
    appId: '57658802078532421',
    fingerprint: 'a1b2c3d4e5f6g7h8__sign',
    bundleName: 'com.audiodock.app',
    appIdentifier: 'com.audiodock.app',
    orgId: 'dev',
    signature: 'MIIDdTCCAl2gAwIBAgIEbNBQ+TANBgkqhkiG9w0BAQsFADCBkDELMAkGA1UEBhMCQ04x...',
  },
  installTime: 1717804800000,
  updateTime: 1735689600000,
  uuid: '9c1d4f18-7c4a-4b13-92e0-7d51a9e0f1d4',
  entryInstallationFree: 0,
  cloudBundleSyncing: false,
  preinstalled: false,
  removable: true,
};

function hasFlag(flags, bit) { return (flags & bit) === bit; }

function projectByFlags(flags) {
  const out = {};
  out.name = fullBundleInfo.name;
  out.vendor = fullBundleInfo.vendor;
  out.versionCode = fullBundleInfo.versionCode;
  out.versionName = fullBundleInfo.versionName;
  out.minCompatibleVersionCode = fullBundleInfo.minCompatibleVersionCode;
  out.targetVersionCode = fullBundleInfo.targetVersionCode;

  if (hasFlag(flags, BundleFlag.GET_BUNDLE_INFO_WITH_APPLICATION)) {
    out.appInfo = fullBundleInfo.appInfo;
  }
  if (hasFlag(flags, BundleFlag.GET_BUNDLE_INFO_WITH_HAP_MODULE)) {
    out.hapModulesInfo = fullBundleInfo.hapModulesInfo;
  }
  if (hasFlag(flags, BundleFlag.GET_BUNDLE_INFO_WITH_REQUESTED_PERMISSION)) {
    out.reqPermissionDetails = fullBundleInfo.reqPermissionDetails;
    out.permissionGrantStates = fullBundleInfo.permissionGrantStates;
  }
  if (hasFlag(flags, BundleFlag.GET_BUNDLE_INFO_WITH_SIGNATURE_INFO)) {
    out.signatureInfo = fullBundleInfo.signatureInfo;
  }
  out.installTime = fullBundleInfo.installTime;
  out.updateTime = fullBundleInfo.updateTime;
  return out;
}

// 真实 bundleManager.getBundleInfoForSelf(flags) 签名: Promise<BundleInfo>
function getBundleInfoForSelf(flags) {
  return new Promise((resolve, reject) => {
    try {
      if (!Number.isInteger(flags)) {
        throw new BusinessError(401, 'Parameter error. Possible causes: Mandatory parameters are left unspecified; Incorrect parameter types.');
      }
      resolve(projectByFlags(flags));
    } catch (err) {
      reject(err);
    }
  });
}

// ===== 调用区（与你在 ets 里写的写法一致） =====
async function run() {
  const flags =
    BundleFlag.GET_BUNDLE_INFO_WITH_APPLICATION |
    BundleFlag.GET_BUNDLE_INFO_WITH_HAP_MODULE |
    BundleFlag.GET_BUNDLE_INFO_WITH_REQUESTED_PERMISSION |
    BundleFlag.GET_BUNDLE_INFO_WITH_SIGNATURE_INFO;

  const data = await getBundleInfoForSelf(flags);
  console.log('===== bundleManager.getBundleInfoForSelf returned =====');
  console.log(JSON.stringify(data, null, 2));
  console.log('===== summary =====');
  console.log(`bundleName : ${data.name}`);
  console.log(`versionName: ${data.versionName}`);
  console.log(`versionCode: ${data.versionCode}`);
  console.log(`hapModules : ${(data.hapModulesInfo ?? []).length}`);
  console.log(`permissions: ${(data.reqPermissionDetails ?? []).map(p => p.name).join(', ')}`);
}

run().catch((err) => {
  console.error('failed:', err);
  process.exit(1);
});
