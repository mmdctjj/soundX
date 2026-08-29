import { Logger } from 'audiodock_common';
import { httpClient } from 'features_network';
import { kvStore } from 'features_storage';

/**
 * 判定当前生效的服务器地址是否为已配置的「内网地址」。
 *
 * 存在意义：封面 / 头像的分级加载需要区分内外网（见 utils/image.ets 的
 * THUMBNAIL_MAX_WIDTH）。但 kvStore 是异步的，而封面 URL 是在组件 build()
 * 里同步算出来的，所以判定结果必须先落到 AppStorage，再由组件通过
 * @StorageLink 订阅 —— 值变化时组件会自动重建并重算 URL。
 */

const TAG = 'NetworkMode';

/** AppStorage 键。组件用 @StorageLink('isInternalNetwork') 订阅即可。 */
export const IS_INTERNAL_KEY: string = 'isInternalNetwork';

/** 与 SourceManagePage 的 SOURCE_TYPES 保持一致 */
const SOURCE_TYPES: string[] = ['AudioDock', 'Subsonic', 'Emby'];

class SourceConfigItem {
  id: string = '';
  internal: string = '';
  external: string = '';
  name: string = '';
}

/**
 * 重新判定内网/外网并写入 AppStorage。
 *
 * 在服务器地址切换后调用：EntryAbility 启动、AuthStore.loadFromStorage、
 * AuthStore.switchServer。
 *
 * 初始值取 false（按外网处理 = 加载缩略图）—— 这是安全方向：
 * 宁可先加载小图，也不会先拉 5MB 原图。且该判定只影响大图档位，
 * 列表与小图恒压缩，首屏完全不受初始化时序影响。
 */
export async function refreshNetworkMode(): Promise<void> {
  let result: boolean = false;
  try {
    const activeAddress: string = httpClient.getBaseURL();
    if (activeAddress.length > 0) {
      // 遍历全部源类型而不是只看 selectedSourceType：
      // selectedSourceType 存的是小写（SourceManagePage 写入时 toLowerCase），
      // 而 sourceConfig_ 的键用的是大写，拼错就永远判定成外网。直接全扫更稳。
      for (const key of SOURCE_TYPES) {
        const raw: string | null = await kvStore.get(`sourceConfig_${key}`);
        if (raw === null || raw.length === 0) continue;
        const parsed: Object = JSON.parse(raw);
        const list: SourceConfigItem[] = Array.isArray(parsed)
          ? parsed as SourceConfigItem[]
          : [parsed as SourceConfigItem];
        if (list.some((item: SourceConfigItem) => item?.internal === activeAddress)) {
          result = true;
          break;
        }
      }
    }
  } catch (e) {
    Logger.w(TAG, `failed: ${(e as Error).message}`);
    result = false;
  }
  AppStorage.setOrCreate(IS_INTERNAL_KEY, result);
}

/** 同步读取当前是否内网（供非组件场景使用） */
export function isInternalNetwork(): boolean {
  return AppStorage.get<boolean>(IS_INTERNAL_KEY) === true;
}
