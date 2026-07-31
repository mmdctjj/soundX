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
  get: <T = any, R = any, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().get<T, R, D>(url, config),
  delete: <T = any, R = any, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().delete<T, R, D>(url, config),
  head: <T = any, R = any, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().head<T, R, D>(url, config),
  options: <T = any, R = any, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().options<T, R, D>(url, config),
  post: <T = any, R = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().post<T, R, D>(url, data, config),
  put: <T = any, R = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().put<T, R, D>(url, data, config),
  patch: <T = any, R = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().patch<T, R, D>(url, data, config),
  postForm: <T = any, R = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().postForm<T, R, D>(url, data, config),
  putForm: <T = any, R = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().putForm<T, R, D>(url, data, config),
  patchForm: <T = any, R = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ) => getRequestInstance().patchForm<T, R, D>(url, data, config),
};

export default request;