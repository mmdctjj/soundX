export * from "@soundx/db";

export interface ISuccessResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface IErrorResponse {
  code: number;
  message: string;
}

export interface ITableData<T> {
  pageSize: number;
  current: number;
  list: T;
  total: number;
}

export interface ILoadMoreData<T> {
  pageSize: number;
  loadCount: number;
  list: T;
  total: number;
}

export interface RecommendedItem {
  title: string
  id: string
  items: any[] // Using any[] temporarily as Album might be imported from @soundx/db
}

export interface TimelineItem {
  id: string
  time: number
  items: any[] // Using any[] temporarily
} 