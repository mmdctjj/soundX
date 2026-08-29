import { httpClient } from 'features_network';
import { isInternalNetwork } from './networkMode';

const PLACEHOLDER = 'https://picsum.photos/seed/placeholder/200/200';

/**
 * 封面 / 头像的分级加载。
 *
 * 后端 `GET /image/optimize` 按 `sha256(src|w|q|fmt)` 落盘缓存
 * （`services/api/src/services/image-optimize.service.ts:151-157`），
 * 每个不同的 `w` 都会生成一份文件。若各调用点把自己算出的宽度直接传下去，
 * 会产生大量缓存碎片 + 磁盘膨胀 + 命中率下降。因此统一量化到固定档位。
 *
 * 档位语义 = **目标设备像素宽度**（不是 CSS 尺寸）。ArkTS 里 `imgWidth` 的单位是 vp，
 * 1vp ≈ 1px @160dpi，实际设备像素约为 vp × (dpi/160)，常见手机是 2~3 倍。
 * 这里统一按 2 倍估算，3 倍屏也按 2 倍算 —— 省约 55% 体积，视觉无感。
 *
 * 各端（desktop / mobile / mini / harmony）共用同一套档位表与规则，
 * 便于后端缓存命中率最大化。
 */

/** 固定档位，升序。300/600/900/1200 与后端 `preGenerate` 预热档位对齐。 */
export const IMAGE_WIDTH_BUCKETS: number[] = [96, 128, 300, 600, 900, 1200];

/**
 * 缩略图上限：量化后的档位 ≤ 此值时，**恒走 /image/optimize，不区分内外网**。
 *
 * 原因：列表场景（曲目列表、专辑网格）一屏 N 张图，瓶颈是**解码内存**而非网速。
 * 一张 3000×3000 的原图解出位图是 `3000×3000×4 = 36MB`，
 * 一个 50 首的列表就是 1.8GB，必然 OOM / 严重卡顿。这与内网外网无关。
 *
 * 超过此值的大图档位（详情页 Hero、全屏封面、艺术家大头像）才按网络环境区分：
 * 内网直连原图，外网走 optimize。
 */
export const THUMBNAIL_MAX_WIDTH: number = 300;

/** 把任意目标宽度向上取整到最近的固定档位 */
export function bucketWidth(width: number): number {
  let w: number = Math.round(width);
  if (!isFinite(w) || w < 16) w = 16;
  if (w > 1500) w = 1500;
  for (const bucket of IMAGE_WIDTH_BUCKETS) {
    if (bucket >= w) return bucket;
  }
  return IMAGE_WIDTH_BUCKETS[IMAGE_WIDTH_BUCKETS.length - 1];
}

/** 量化后的档位是否属于「恒压缩」的缩略图档 */
export function isThumbnailBucket(bucket: number): boolean {
  return bucket <= THUMBNAIL_MAX_WIDTH;
}

/**
 * 封面 / 头像 URL。
 *
 * @param path 图片路径（相对 `/covers/...`）或完整 http(s) 外链
 * @param width 目标设备像素宽度（ArkTS 侧传 vp 值即可，按 2 倍估算），默认 300。
 *   默认 300 落在「恒压缩」档，即未显式标注尺寸的调用点一律拿到缩略图 —— 安全默认值。
 */
export function getImageUrl(path?: string | null, width: number = 300): string {
  if (!path) return PLACEHOLDER;
  // 外部源（Subsonic / Emby）的封面是外链，不走本服务的缩略图代理
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const cleanBase = httpClient.getBaseURL();
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const originalUrl = `${cleanBase}/${cleanPath.split('/').map(encodeURIComponent).join('/')}`;

  // 只有 /covers/ 能走缩略图代理。
  // /music/ 虽然在后端白名单里，但 `resolveLocalSource` 对它返回 null
  // （image-optimize.service.ts:142-149），请求必 404。
  if (!cleanPath.startsWith('covers/') || width < 16) {
    return originalUrl;
  }

  const bucket: number = bucketWidth(width);

  // 缩略图档恒压缩；大图档位才看网络环境。
  if (!isThumbnailBucket(bucket) && isInternalNetwork()) {
    return originalUrl;
  }

  const src = `/${cleanPath}`;
  return `${cleanBase}/image/optimize?src=${encodeURIComponent(src)}&w=${bucket}&q=72&fmt=webp`;
}
