/**
 * 把任意值安全转字符串，避免渲染层拿到 [object Object]。
 * 优先取字符串，否则用 JSON.stringify（对象/数组）；null/undefined 走兜底。
 */
export function safeStringify(value: string | object | null | undefined, fallback: string): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

export class HttpError extends Error {
  status: number;
  body: object | null;

  constructor(status: number, message: string, body: object | null = null) {
    // message 在 TS 里被约束为 string，但调用方可能传过来对象/数组等；
    // 这里强制转字符串，否则 Error.message 是对象会让 UI 渲染成 [object Object]。
    const safeMessage: string = safeStringify(message, `HTTP ${status}`);
    super(safeMessage);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }

  static fromStatus(status: number, body: object | null): HttpError {
    let msg = `HTTP ${status}`;
    if (body !== null && typeof body === 'object') {
      const bodyObj = body as Record<string, Object>;
      if (bodyObj['message'] !== undefined && typeof bodyObj['message'] === 'string') {
        msg = bodyObj['message'];
      }
    }
    return new HttpError(status, msg, body);
  }
}