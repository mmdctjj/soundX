import request from "../https";
import type { ISuccessResponse, User } from "../models";

export const login = async (user: Partial<User>) => {
  const deviceName = await (window as any).ipcRenderer?.getName?.() || `${navigator.userAgent}（Mac）`;
  return request.post<any, ISuccessResponse<User & { token: string }>>(
    "/auth/login",
    { ...user, deviceName }
  );
};

export const register = (user: Partial<User>) => {
  return request.post<any, ISuccessResponse<User & { token: string }>>(
    "/auth/register",
    user
  );
};
