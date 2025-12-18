import request from "../https";
import type { ISuccessResponse, User } from "../models";

export const getUserList = () => {
  return request.get<any, ISuccessResponse<User[]>>("/user/list");
};
