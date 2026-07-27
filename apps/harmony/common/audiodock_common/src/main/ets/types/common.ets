export type Nullable<T> = T | null;

export interface ResultOk<T> {
  ok: true;
  value: T;
}

export interface ResultError<E> {
  ok: false;
  error: E;
}

export type Result<T, E = Error> = ResultOk<T> | ResultError<E>;

export interface PageResp<T> {
  data: T[];
  total: number;
  current: number;
  pageSize: number;
}

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
