import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { DEFAULT_CACHE_DIR } from '../common/media-paths';

export type OutputFormat = 'webp' | 'jpeg';

export interface OptimizedImage {
  buffer: Buffer;
  etag: string;
  contentType: string;
  cacheHit: boolean;
}

export class ImageOptimizeError extends Error {
  code: 'OUT_OF_ALLOWLIST' | 'NOT_FOUND' | 'INVALID_SRC';
  constructor(code: 'OUT_OF_ALLOWLIST' | 'NOT_FOUND' | 'INVALID_SRC', message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * 图片缩放服务（运行时按需生成 + disk cache）。
 *
 * 输入 src 仅允许 /covers/ 或 /music/ 前缀（白名单），避免代理任意远端资源（SSRF）。
 * 第一次请求：sharp() resize + toFormat + toBuffer + 落盘到 ${CACHE_DIR}/.optimized/<sha256>.<fmt>
 * 后续请求：直接从磁盘读，O(1) 返回。
 *
 * ETag = sha256(src|w|q|fmt)，与磁盘文件名一致，命中可直接 304 兼容未来 conditional GET。
 */
@Injectable()
export class ImageOptimizeService {
  private readonly cacheRoot: string;
  private static readonly SHARP_INPUT_LIMIT_PIXELS = 268_402_689; // ≈16384x16384 防 RAM DoS
  private readonly allowlistPrefixes: string[];

  constructor() {
    const cacheDir = path.resolve(process.env.CACHE_DIR || DEFAULT_CACHE_DIR);
    this.cacheRoot = path.join(cacheDir, '.optimized');
    fs.mkdirSync(this.cacheRoot, { recursive: true });
    // 与 main.ts 中 app.useStaticAssets(cacheDir, prefix:'/covers/') 一致：所有封面走 /covers/
    // music 目录下的内嵌封面（例如 import 时直接挂在专辑记录里的相对路径）走 /music/ 前缀
    this.allowlistPrefixes = ['/covers/', '/music/'];
  }

  async optimize(
    rawSrc: string,
    width: number,
    quality: number | undefined,
    format: OutputFormat,
  ): Promise<OptimizedImage> {
    const src = this.normalizeSrc(rawSrc);
    const normalizedSrc = this.assertAllowlisted(src);

    const effQuality = quality ?? (format === 'webp' ? 75 : 80);
    const cacheKey = this.makeCacheKey(normalizedSrc, width, effQuality, format);
    const cachePath = this.cachePathFor(cacheKey, format);

    if (fs.existsSync(cachePath)) {
      const buf = await fs.promises.readFile(cachePath);
      return { buffer: buf, etag: cacheKey, contentType: this.contentTypeFor(format), cacheHit: true };
    }

    const sourcePath = this.resolveLocalSource(normalizedSrc);
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      throw new ImageOptimizeError('NOT_FOUND', `source not found: ${normalizedSrc}`);
    }

    let pipeline = sharp(sourcePath, { limitInputPixels: ImageOptimizeService.SHARP_INPUT_LIMIT_PIXELS })
      .resize({ width, withoutEnlargement: true });

    if (format === 'webp') {
      pipeline = pipeline.webp({ quality: effQuality });
    } else {
      pipeline = pipeline.jpeg({ quality: effQuality, mozjpeg: true });
    }

    const buffer = await pipeline.toBuffer();
    // 落盘用 atomic-ish 写：写到临时文件再 rename，避免并发同一 key 时写到一半
    const tmpPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmpPath, buffer);
    await fs.promises.rename(tmpPath, cachePath);

    return { buffer, etag: cacheKey, contentType: this.contentTypeFor(format), cacheHit: false };
  }

  /**
   * 归一化 src：
   *  - 去掉 query / hash
   *  - 解码
   *  - 防 path traversal（解析为绝对路径后校验前缀）
   */
  private normalizeSrc(raw: string): string {
    const noQuery = raw.split('?')[0].split('#')[0];
    let decoded: string;
    try {
      decoded = decodeURIComponent(noQuery);
    } catch {
      throw new ImageOptimizeError('INVALID_SRC', 'src is not a valid URI');
    }
    if (!decoded.startsWith('/')) {
      // 非绝对路径强制前缀
      decoded = `/${decoded.replace(/^\/+/, '')}`;
    }
    return decoded;
  }

  private assertAllowlisted(src: string): string {
    const ok = this.allowlistPrefixes.some((p) => src.startsWith(p));
    if (!ok) {
      throw new ImageOptimizeError(
        'OUT_OF_ALLOWLIST',
        `src must start with one of: ${this.allowlistPrefixes.join(', ')}`,
      );
    }
    // 解析相对部分，校验不越界
    const normalized = path.posix.normalize(src);
    if (normalized.includes('..')) {
      throw new ImageOptimizeError('OUT_OF_ALLOWLIST', 'path traversal detected');
    }
    return normalized;
  }

  /**
   * 把 /covers/foo.jpg 映射到本地磁盘：${CACHE_DIR}/foo.jpg
   * 把 /music/foo.jpg 映射到本地磁盘：${MUSIC_BASE_DIR}/foo.jpg（视部署而定）
   *
   * 当前实现只支持 /covers/（这是静态服务暴露的真实路径）。
   * /music/ 路径在原图可经 nginx 静态服务访问的情况下可后续扩展。
   */
  private resolveLocalSource(src: string): string | null {
    if (src.startsWith('/covers/')) {
      const cacheDir = path.resolve(process.env.CACHE_DIR || DEFAULT_CACHE_DIR);
      const abs = path.join(cacheDir, src.replace(/^\/covers\//, ''));
      return abs;
    }
    return null; // 暂不直接代理 /music/ 下的图片（可用 nginx 直接静态服务），后续按需扩展
  }

  private makeCacheKey(src: string, w: number, q: number, fmt: OutputFormat): string {
    return crypto.createHash('sha256').update(`${src}|${w}|${q}|${fmt}`).digest('hex').slice(0, 32);
  }

  private cachePathFor(key: string, fmt: OutputFormat): string {
    return path.join(this.cacheRoot, `${key}.${fmt === 'webp' ? 'webp' : 'jpg'}`);
  }

  private contentTypeFor(fmt: OutputFormat): string {
    return fmt === 'webp' ? 'image/webp' : 'image/jpeg';
  }
}
