import request from "../https";
import type { ISuccessResponse, User } from "../models";

export const login = (user: User) => {
  return request.post<any, ISuccessResponse<User & { token: string }>>(
    "/auth/login",
    user
  );
};
