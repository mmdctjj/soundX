import { useEffect, useRef } from "react";

interface UseInViewOptions extends IntersectionObserverInit {
  once?: boolean;
}

/**
 * 懒加载图片或其他元素的 Hook
 * @param options IntersectionObserver 配置项
 * @returns ref - 绑定到需要监听的容器上
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = { threshold: 0.5, once: true }
) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio <= 0) return;

        const img = entry.target as HTMLImageElement;
        const src = img.getAttribute("data-src");
        if (src) {
          img.src = src;
          img.classList.add("fade-in2");
        }

        if (options.once) observer.unobserve(img);
      });
    }, options);

    const container = containerRef.current;
    if (container) {
      const targets = container.querySelectorAll("[data-src]");
      targets.forEach((el) => observer.observe(el));
    }

    return () => observer.disconnect();
  }, [options]);

  return containerRef;
}

export function useLazyBackgroundImage() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const bg = el.getAttribute("data-bg");

            if (bg) {
              const img = new Image();
              img.src = bg;

              img.onload = () => {
                // 图片加载完后才替换背景
                el.style.backgroundImage = `url(${bg})`;
                el.style.backgroundImage = `url(${bg})`;
                el.classList.add("fade-in2");
                img.onload = null;
              };
              observer.unobserve(el);
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return ref;
}
