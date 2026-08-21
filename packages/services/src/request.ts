import type { AxiosInstance, AxiosRequestConfig } from "axios";

let requestInstance: AxiosInstance | null = null;

export const setRequestInstance = (instance: AxiosInstance) => {
  requestInstance = instance;
};

export const getRequestInstance = (): AxiosInstance => {
  if (!requestInstance) {
    throw new Error("Request instance not initialized. Please call setRequestInstance first.");
  }
  return requestInstance;
};

export const getBaseURL = () => {
    if (requestInstance) {
        return requestInstance.defaults.baseURL || "";
    }
    return "";
};

// Facade to match typical axios usage: request.get, request.post etc.
//
// Explicit return-type annotations are required: when TypeScript infers the
// return type from the underlying axios instance, the inferred signature drags
// in internal branded `unique symbol` types that cannot be re-exported in a
// declaration file (TS2527).
//
// We intentionally default `R` to `any` (instead of `AxiosResponse<T>`) so that
// callers like `request.get<MyType>(...)` get back `Promise<any>`, matching
// the previous behavior and remaining assignable to `Promise<MyType>` at call
// sites.
type GetPromise = <T = any, R = any, D = any>(
  url: string,
  config?: AxiosRequestConfig<D>,
) => Promise<R>;
type PostPromise = <T = any, R = any, D = any>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig<D>,
) => Promise<R>;

export const request: {
  get: GetPromise;
  delete: GetPromise;
  head: GetPromise;
  options: GetPromise;
  post: PostPromise;
  put: PostPromise;
  patch: PostPromise;
  postForm: PostPromise;
  putForm: PostPromise;
  patchForm: PostPromise;
} = {
  // NOTE: the wrapper exposes <T, R, D> for caller convenience (so callers
  // can write `request.get<MyType>(...)` and have the return type be
  // `Promise<R>`), but we intentionally do NOT forward those generics to
  // the underlying axios call. Newer axios type definitions return an
  // internal `AxiosResponseResult<T, R, D, _>` shape from `.get<T, R, D>(...)`
  // that is not assignable to `Promise<R>` — forwarding the generics would
  // either fail to type-check (TS2322) or pull branded `unique symbol` types
  // into the inferred return that the declaration emitter can't serialize
  // (TS2527). Calling without generics keeps the implementation simple and
  // uses axios's own defaults; the `as Promise<R>` cast restores the
  // declared shape.
  get: <T = any, R = any, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().get(url, config) as Promise<R>,
  delete: <T = any, R = any, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().delete(url, config) as Promise<R>,
  head: <T = any, R = any, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().head(url, config) as Promise<R>,
  options: <T = any, R = any, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().options(url, config) as Promise<R>,
  post: <T = any, R = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().post(url, data, config) as Promise<R>,
  put: <T = any, R = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().put(url, data, config) as Promise<R>,
  patch: <T = any, R = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().patch(url, data, config) as Promise<R>,
  postForm: <T = any, R = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().postForm(url, data, config) as Promise<R>,
  putForm: <T = any, R = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().putForm(url, data, config) as Promise<R>,
  patchForm: <T = any, R = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().patchForm(url, data, config) as Promise<R>,
};

export default request;