import React, { useEffect, useRef, useState } from "react";

interface LazyImageProps {
  src: string | undefined;
  alt?: string;
  /** 目标显示宽度（像素）。必须传，避免 CLS */
  width: number | string;
  /** 目标显示高度（像素）。必须传，避免 CLS */
  height: number | string;
  className?: string;
  style?: React.CSSProperties;
  /** 自定义占位组件；不传则使用统一的灰色背景 */
  renderPlaceholder?: (size: { width: number | string; height: number | string }) => React.ReactNode;
  /** 当 src 缺失时是否仍渲染占位（默认 true） */
  showPlaceholderWhenMissing?: boolean;
  /** 提前触发加载的 rootMargin（默认 "200px"） */
  rootMargin?: string;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

/**
 * 视口懒加载的 <img> 包装
 *
 * 用法：
 *   <LazyImage src={getCoverUrl(track.cover, 80)} width={80} height={80} alt={track.name} />
 *
 * 关键点：
 *  - width / height 强制约束（消除 CLS / 布局抖动）
 *  - 进入视口 + rootMargin 缓冲才设置 src，控制并发
 *  - 原生 loading="lazy" + decoding="async" 作为额外兜底
 *  - 占位与最终图片布局完全一致（避免抖动）
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  style,
  renderPlaceholder,
  showPlaceholderWhenMissing = true,
  rootMargin = "200px",
  onClick,
  onLoad,
  onError,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  // src 变化时重置"加载中"状态，让新 src 重新走视口判定逻辑
  useEffect(() => {
    setShouldLoad(false);
    if (!wrapperRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
      // 极旧环境兜底：直接加载
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin, threshold: 0.01 },
    );
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [src, rootMargin]);

  const placeholder =
    renderPlaceholder?.({ width, height }) ??
    (typeof width === "number" && typeof height === "number" ? (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 100%)",
        }}
      />
    ) : null);

  const hasSrc = !!src;

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
      className={className}
    >
      {hasSrc && shouldLoad ? (
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          onClick={onClick}
          onLoad={onLoad}
          onError={onError}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : showPlaceholderWhenMissing || !hasSrc ? (
        placeholder
      ) : null}
    </div>
  );
};

export default LazyImage;
