/**
 * 分页加载公共类型
 *
 * 已有 ILoadMoreData 来自后端协议层（包含 loadCount/pageSize/total）；
 * 这里再定义一层 PageFetcher + IPagedResult，封装"无限滚动"前端语义，
 * 让 web、mobile、harmony 各端可以用同一个 hook 接不同的 adapter 接口。
 */

/** 一次分页拉取的结果（前端无限滚动语义） */
export interface IPagedResult<T> {
  list: T[];
  /** 还有更多数据可拉 */
  hasMore: boolean;
  /** 总条数（可选，后端没返回时为 undefined） */
  total?: number;
}

/**
 * 分页 fetcher 统一签名
 *
 *   pageSize: 本次请求要多少条
 *   skip:     从第几条开始（>=0），等价 skip = pageSize * loadCount
 *
 * 实现端通常内部包一层 adapter（如 getFavoriteAlbums(userId, pageSize, skip)），
 * 返回时把 ILoadMoreData 的 loadCount 反算成 hasMore：
 *   hasMore = list.length === pageSize
 */
export type PageFetcher<T, TArgs extends Record<string, unknown> = Record<string, never>> = (
  args: { pageSize: number; skip: number } & TArgs,
) => Promise<IPagedResult<T>>;
