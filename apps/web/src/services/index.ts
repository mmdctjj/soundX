// 基于 fetch 的统一 http 请求工具
export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
}

export interface ResponseData<T = any> {
  code: number;
  message: string;
  data: T;
}

function buildQuery(params?: Record<string, any>): string {
  if (!params) return '';
  return (
    '?' +
    Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
  );
}

export async function http<T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<ResponseData<T>> {
  const { method = 'GET', headers = {}, body, params } = options;
  let fetchUrl = url + buildQuery(params);
  console.log('fetchUrl', fetchUrl);

  // 请求拦截处理
  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (body) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  try {
    console.log('fetchOptions', fetchOptions);
    const response = await fetch(fetchUrl, fetchOptions);
    // 响应拦截处理
    const result = await response.json();
    console.log('result', result);
    if (!response.ok) {
      throw new Error(result.message || '请求失败');
    }
    return result;
  } catch (error: any) {
    // 统一错误处理
    return {
      code: -1,
      message: error.message || '网络异常',
      data: {} as T
    };
  }
}