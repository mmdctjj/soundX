import request from "../https";
import type { Device, ISuccessResponse, User } from "../models";

export const login = (user: Partial<User> & { deviceName?: string }) => {
  return request.post<any, ISuccessResponse<User & { token: string; device: Device }>>(
    "/auth/login",
    user
  );
};

export const register = (user: Partial<User> & { deviceName?: string }) => {
  return request.post<any, ISuccessResponse<User & { token: string; device: Device }>>(
    "/auth/register",
    user
  );
};
