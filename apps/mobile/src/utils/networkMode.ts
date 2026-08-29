import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 判定当前生效的服务器地址是否为已配置的「内网地址」。
 *
 * 存在意义：封面 / 头像的分级加载需要区分内外网（见 imageBucket.ts 的
 * THUMBNAIL_MAX_WIDTH）。但 AsyncStorage 是异步的，而 `getImageUrl` 是同步纯函数、
 * 在 React 渲染里被调用 40+ 次，不能改成 async。
 *
 * 所以这里维护一个模块级变量，由 AuthContext 在服务器地址切换时异步刷新；
 * `getImageUrl` 同步读它。
 *
 * 初始值 false（按外网处理 = 加载缩略图）—— 安全方向：
 * 宁可先加载小图，也不会先拉 5MB 原图。且该判定只影响大图档位，
 * 列表与小图恒压缩，首屏完全不受初始化时序影响。
 */

let _isInternal = false;

/** 同步读取当前是否内网。供 `getImageUrl` 在渲染期调用，必须保持同步。 */
export const isInternalNetworkSync = (): boolean => _isInternal;

/**
 * 异步刷新内网判定。
 *
 * 由 AuthContext 在以下时机调用：启动加载、自动切换服务器（AppState 回前台 /
 * 网络状态变化）。判定逻辑复用 playbackQuality.ts 的比对方式。
 *
 * @returns 刷新后的结果
 */
export const refreshNetworkMode = async (): Promise<boolean> => {
  let result = false;
  try {
    const activeAddress = (await AsyncStorage.getItem("serverAddress")) || "";
    const sourceType =
      (await AsyncStorage.getItem("selectedSourceType")) || "AudioDock";

    if (activeAddress) {
      const configStr = await AsyncStorage.getItem(`sourceConfig_${sourceType}`);
      if (configStr) {
        const parsed = JSON.parse(configStr);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        result = list.some((config: any) => config?.internal === activeAddress);
      }
    }
  } catch {
    // 读失败按外网处理 —— 安全方向
    result = false;
  }

  _isInternal = result;
  return result;
};
