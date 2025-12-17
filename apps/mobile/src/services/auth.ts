import request from "../https";
import type { ISuccessResponse, User } from "../models";

export const login = (user: Partial<User> & { deviceName?: string }) => {
  return request.post<any, ISuccessResponse<User & { token: string }>>(
    "/auth/login",
    user
  );
};

export const register = (user: Partial<User>) => {
  return request.post<any, ISuccessResponse<User & { token: string }>>(
    "/auth/register",
    user
  );
};
