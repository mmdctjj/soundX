import { getBaseURL } from "../https";

export const getCoverUrl = (path?: string | null, id?: number) => {
  return path
    ? `${getBaseURL()}${path}`
    : `https://picsum.photos/seed/${id}/300/300`;
};