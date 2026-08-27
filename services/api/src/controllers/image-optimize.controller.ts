import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../common/public.decorator';
import { ImageOptimizeService, OptimizedImage, OutputFormat } from '../services/image-optimize.service';

/**
 * 缩略图代理：将原图（/covers/ 下的封面、专辑封面、艺术家头像等）按需 resize + 压缩，
 * 落盘到磁盘二次缓存，前端任意页面统一通过 /image/optimize 拉取适合显示尺寸的图片。
 *
 * 安全：
 *  - src 仅允许 /covers/ 或 /music/ 前缀（白名单），避免 SSRF 与 path traversal
 *  - w 上限 1500，q 1-100，避免 RAM DoS
 *
 * 性能：
 *  - 首次按 (src, w, q, fmt) 生成后落盘到 ${CACHE_DIR}/.optimized/<sha256>.<fmt>，
 *  - Cache-Control: public, max-age=31536000, immutable + ETag，浏览器强缓存
 */
@Controller('image')
export class ImageOptimizeController {
  private readonly logger = new Logger(ImageOptimizeController.name);
  constructor(private readonly service: ImageOptimizeService) {}

  @Public()
  @Get('optimize')
  async optimize(
    @Query('src') src: string,
    @Query('w') w: string,
    @Query('q') q: string | undefined,
    @Query('fmt') fmt: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!src || typeof src !== 'string') {
      throw new BadRequestException('src is required');
    }
    if (!w || !/^\d+$/.test(String(w))) {
      throw new BadRequestException('w is required (positive integer)');
    }
    const width = Number(w);
    if (!Number.isFinite(width) || width < 16 || width > 1500) {
      throw new BadRequestException('w must be in [16, 1500]');
    }

    let quality: number | undefined;
    if (q !== undefined) {
      if (!/^\d+$/.test(String(q))) {
        throw new BadRequestException('q must be an integer');
      }
      quality = Number(q);
      if (quality < 1 || quality > 100) {
        throw new BadRequestException('q must be in [1, 100]');
      }
    }

    let format: OutputFormat = 'webp';
    if (fmt !== undefined) {
      if (fmt !== 'webp' && fmt !== 'jpeg') {
        throw new BadRequestException('fmt must be webp or jpeg');
      }
      format = fmt;
    }

    let result: OptimizedImage;
    try {
      result = await this.service.optimize(src, width, quality, format);
    } catch (err: any) {
      if (err?.code === 'OUT_OF_ALLOWLIST' || err?.code === 'NOT_FOUND' || err?.code === 'INVALID_SRC') {
        this.logger.warn(`reject image/optimize: src=${src} err=${err.message}`);
        throw new NotFoundException('source image not found');
      }
      this.logger.error(`image/optimize failed: src=${src} err=${(err as Error).stack || err}`);
      throw new BadRequestException('failed to process image');
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', String(result.buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', `"${result.etag}"`);
    res.setHeader('X-Image-Optimize-Cache', result.cacheHit ? 'HIT' : 'MISS');
    res.status(200).end(result.buffer);
  }
}
