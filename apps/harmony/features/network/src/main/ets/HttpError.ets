export class HttpError extends Error {
  status: number;
  body: object | null;

  constructor(status: number, message: string, body: object | null = null) {
    super(message);
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