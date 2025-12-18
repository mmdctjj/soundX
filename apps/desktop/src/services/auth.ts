import request from "../https";
import type { Device, ISuccessResponse, User } from "../models";

const deviceName = await (window as any).ipcRenderer?.getName?.() || `${navigator.userAgent}`;

export const login = async (user: Partial<User>) => {
  return request.post<any, ISuccessResponse<User & { token: string, device: Device }>>(
    "/auth/login",
    { ...user, deviceName }
  );
};

export const register = (user: Partial<User>) => {
  return request.post<any, ISuccessResponse<User & { token: string, device: Device }>>(
    "/auth/register",
    { ...user, deviceName }
  );
};
