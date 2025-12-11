import request from "../https";
import type { ISuccessResponse } from "../models";

export const reportAudiobookProgress = (data: {
  userId: number;
  trackId: number;
  progress: number;
}) => {
  return request.post<any, ISuccessResponse<any>>("/user-audiobook-histories", data);
};
