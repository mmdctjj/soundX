export interface IResponse {
  message: string | unknown;
}

export interface IErrorResponse extends IResponse {
  code: 500;
}

export interface ISuccessResponse<T> extends IResponse {
  code: 200;
  data: T;
}

export interface IAuthFaildResponse extends IResponse {
  code: 401;
}

export interface IParamsErrorResponse extends IResponse {
  code: 400;
}

export interface INotFoundResponse extends IResponse {
  code: 404;
}

export interface IForbiddenResponse extends IResponse {
  code: 403;
}

export interface ITableData<T> {
  pageSize: number;
  current: number;
  total: number;
  list: T;
}

export interface ILoadMoreData<T> {
  loadCount: number;
  pageSize: number;
  total: number;
  list: T;
  /** 兼容字段：前端 useLoadMore 直接读 hasMore，缺省时用 list.length >= pageSize 兜底 */
  hasMore?: boolean;
}
