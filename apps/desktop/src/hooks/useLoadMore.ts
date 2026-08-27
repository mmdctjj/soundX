import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IPagedResult, PageFetcher } from "@soundx/services";

/**
 * 通用无限滚动加载 hook
 *
 * 用法：
 *   const { list, hasMore, loading, loadingMore, error, sentinelRef, reload } = useLoadMore({
 *     fetcher: ({ skip, pageSize }) =>
 *       getFavoriteAlbums(userId, pageSize, skip).then(res => {
 *         const list = (res.data?.list ?? []).map(item => item.album);
 *         return { list, hasMore: list.length === pageSize, total: res.data?.total };
 *       }),
 *     pageSize: 100,
 *     deps: [userId],
 *   });
 *
 *   return (
 *     <VirtualTrackList tracks={list} loading={loading} />
 *     {hasMore && <div ref={sentinelRef}><Spin /></div>}
 *   );
 *
 * 关键点：
 *  - 自动去重（按 id）；同一页重复拉不会增加 list
 *  - sentinelRef 绑 IntersectionObserver，进入视口自动 loadMore
 *  - reload() 强制重置（用于下拉刷新）
 *  - 错误时不会清空 list，hasMore 维持，可手动重试
 */

export interface UseLoadMoreOptions<T, TArgs extends Record<string, unknown> = Record<string, never>> {
  fetcher: PageFetcher<T, TArgs>;
  pageSize?: number;
  /** fetcher 额外参数（稳定） */
  args?: TArgs;
  /** 与 list 顺序及 fetcher 行为相关的 deps（变化时自动 reload） */
  deps?: ReadonlyArray<unknown>;
  /** 去重 key extractor（默认按 list 元素的 id 字段） */
  uniqueKey?: (item: T, index: number) => string | number;
  /** 初次加载是否立即触发（默认 true） */
  immediate?: boolean;
}

export interface UseLoadMoreResult<T> {
  list: T[];
  hasMore: boolean;
  total: number | undefined;
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  sentinelRef: (node: Element | null) => void;
  reload: () => void;
}

export function useLoadMore<T, TArgs extends Record<string, unknown> = Record<string, never>>(
  options: UseLoadMoreOptions<T, TArgs>,
): UseLoadMoreResult<T> {
  const { fetcher, pageSize = 100, args, deps = [], uniqueKey, immediate = true } = options;

  const keyOf = useCallback(
    (item: T, index: number) => {
      if (uniqueKey) return uniqueKey(item, index);
      const anyItem = item as unknown as { id?: string | number };
      if (anyItem.id !== undefined && anyItem.id !== null) return anyItem.id;
      return index;
    },
    [uniqueKey],
  );

  const [list, setList] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 避免闭包过期：fetcher 通过 ref 保存最新版本，loadingMore 拿最新状态
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const argsRef = useRef(args);
  argsRef.current = args;
  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;
  const seenRef = useRef<Set<string | number>>(new Set());
  const loadingRef = useRef(false);
  const sentinelRef = useRef<Element | null>(null);

  // 把"最新 hasMore/loadingMore"以 ref 暴露给 Observer 回调，避免无限 re-bind
  const hasMoreRef = useRef(true);
  hasMoreRef.current = hasMore;
  const loadingMoreRef = useRef(false);
  loadingMoreRef.current = loadingMore;

  const loadPage = useCallback(
    async (skip: number, isFirst: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        if (isFirst) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        const ps = pageSizeRef.current;
        const result: IPagedResult<T> = await fetcherRef.current({
          ...(argsRef.current || ({} as TArgs)),
          pageSize: ps,
          skip,
        });

        setList((prev) => {
          const next = isFirst ? [] : prev.slice();
          for (const item of result.list) {
            // list 真实 index 不准确（先去重不影响 dedupe 顺序），但 keyOf 默认基于 item.id 仍稳定
            const k = keyOf(item, next.length);
            if (seenRef.current.has(k)) continue;
            seenRef.current.add(k);
            next.push(item);
          }
          return next;
        });
        setHasMore(result.hasMore);
        if (typeof result.total === "number") setTotal(result.total);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        // 出错不打破分页——保留当前 list，下次 retry
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [keyOf],
  );

  // 首次加载与 deps 变化时重置 + 重拉
  useEffect(() => {
    if (!immediate) return;
    setList([]);
    setHasMore(true);
    setTotal(undefined);
    seenRef.current.clear();
    loadPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps]);

  // IntersectionObserver 监听 sentinelRef（绑一次，依赖通过 ref 拿）
  const setSentinelRef = useCallback((node: Element | null) => {
    if (sentinelRef.current === node) return;
    if (sentinelRef.current && (sentinelRef.current as any).__observer) {
      (sentinelRef.current as any).__observer.disconnect();
      (sentinelRef.current as any).__observer = null;
    }
    if (node) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
              loadPage(seenRef.current.size, false);
            }
          }
        },
        { rootMargin: "400px 0px" },
      );
      observer.observe(node);
      (node as any).__observer = observer;
    }
    sentinelRef.current = node;
  }, [loadPage]);

  const reload = useCallback(() => {
    setList([]);
    setHasMore(true);
    setTotal(undefined);
    seenRef.current.clear();
    loadPage(0, true);
  }, [loadPage]);

  return useMemo(
    () => ({
      list,
      hasMore,
      total,
      loading,
      loadingMore,
      error,
      sentinelRef: setSentinelRef,
      reload,
    }),
    [list, hasMore, total, loading, loadingMore, error, setSentinelRef, reload],
  );
}
