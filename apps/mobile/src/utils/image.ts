import { getBaseURL } from "../https";
import { bucketWidth, isThumbnailBucket } from "./imageBucket";
import { isInternalNetworkSync } from "./networkMode";

/**
 * Get full image URL
 *
 * 分级加载（详见 `./imageBucket.ts`）：
 *  1. width 先量化到固定档位 [96,128,300,600,900,1200]，避免后端缓存碎片化；
 *  2. 缩略图档位（≤300）恒走 /image/optimize，不区分内外网 —— 列表一屏 N 张图，
 *     瓶颈是解码内存而非网速（50 张 3000×3000 原图 = 1.8GB 位图，必然 OOM）；
 *  3. 大图档位（>300）才看网络环境：内网直连原图，外网走 optimize。
 *
 * 注意：本函数必须保持同步纯函数 —— 它被 40+ 处调用点在 React 渲染里同步调用，
 * 改成 async 会波及全部调用点。网络状态通过 `networkMode.ts` 的模块级变量同步读取。
 *
 * @param path Image path or URL
 * @param placeholder Alternative placeholder if path is missing
 * @param width 目标设备像素宽度（按显示尺寸 ×2 估算），默认 300。
 *   默认 300 落在「恒压缩」档 —— 未显式标注尺寸的调用点一律拿到缩略图，安全默认值。
 * @returns Full URL
 */
export const getImageUrl = (
  path?: string | null,
  placeholder?: string,
  width = 300,
) => {
  if (!path) return placeholder || "https://picsum.photos/seed/placeholder/200/200";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const baseURL = getBaseURL();
  const cleanBaseURL = baseURL.endsWith("/") ? baseURL.substring(0, baseURL.length - 1) : baseURL;
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  const originalUrl = `${cleanBaseURL}/${cleanPath.split('/').map(encodeURIComponent).join('/')}`;

  // 只有 /covers/ 能走缩略图代理。
  // /music/ 虽然在后端白名单里，但 `resolveLocalSource` 对它返回 null
  // （image-optimize.service.ts:142-149），请求必 404。
  if (!cleanPath.startsWith("covers/") || width < 16) {
    return originalUrl;
  }

  const bucket = bucketWidth(width);

  // 大图档位才按网络环境区分；缩略图档位恒压缩（理由见 imageBucket.ts）。
  if (!isThumbnailBucket(bucket) && isInternalNetworkSync()) {
    return originalUrl;
  }

  const src = `/${cleanPath}`;
  return `${cleanBaseURL}/image/optimize?src=${encodeURIComponent(src)}&w=${bucket}&q=72&fmt=webp`;
};
