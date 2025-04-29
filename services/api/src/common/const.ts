export interface IResponse {
  message: string;
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

export class BaseResponse<T> {
  message: string;
  code: number;
  data: T;
  constructor(message: string, code: number, data: T) {
    this.message = message;
    this.code = code;
    this.data = data;
  }
}

export class ErrorResponse extends BaseResponse<null> {
  constructor(message: string) {
    super(message, 500, null);
  }
}
export class SuccessResponse<T> extends BaseResponse<T> {
  constructor(message: string, data: T) {
    super(message, 200, data);
  }
}
