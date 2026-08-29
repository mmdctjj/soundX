/**
 * 封面 / 头像的分级加载档位表。
 *
 * 后端 `GET /image/optimize` 按 `sha256(src|w|q|fmt)` 落盘缓存
 * （`services/api/src/services/image-optimize.service.ts:151-157`），
 * 每个不同的 `w` 都会生成一份文件。若各调用点把自己算出的宽度直接传下去，
 * 会产生大量缓存碎片 + 磁盘膨胀 + 命中率下降。因此统一量化到固定档位。
 *
 * 档位语义 = **目标设备像素宽度**（不是 CSS 尺寸），按「显示尺寸 × 2」估算。
 * 3x 屏也按 2x 算 —— 省约 55% 体积，视觉无感。
 *
 * 各端（desktop / mobile / mini / harmony）共用同一套档位表与规则，
 * 便于后端缓存命中率最大化。
 */

/** 固定档位，升序。300/600/900/1200 与后端 `preGenerate` 预热档位对齐。 */
export const IMAGE_WIDTH_BUCKETS = [96, 128, 300, 600, 900, 1200] as const;

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
export const THUMBNAIL_MAX_WIDTH = 300;

/**
 * 把任意目标宽度向上取整到最近的固定档位。
 * @param width 目标设备像素宽度
 */
export const bucketWidth = (width: number): number => {
  const w = Math.min(Math.max(Math.round(Number(width) || 0), 16), 1500);
  for (const bucket of IMAGE_WIDTH_BUCKETS) {
    if (bucket >= w) return bucket;
  }
  return IMAGE_WIDTH_BUCKETS[IMAGE_WIDTH_BUCKETS.length - 1];
};

/** 量化后的档位是否属于「恒压缩」的缩略图档 */
export const isThumbnailBucket = (bucket: number): boolean =>
  bucket <= THUMBNAIL_MAX_WIDTH;
