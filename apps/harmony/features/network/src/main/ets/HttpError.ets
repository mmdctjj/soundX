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
    const msg = (body as { message?: string })?.message ?? `HTTP ${status}`;
    return new HttpError(status, msg, body);
  }
}