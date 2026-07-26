import request from "./request";
import type { ISuccessResponse } from "./models";

export type WebDavPathKind = "MUSIC" | "AUDIOBOOK" | "MV";

export interface WebDavSource {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  enabled: boolean;
  paths?: {
    MUSIC?: string | string[];
    AUDIOBOOK?: string | string[];
    MV?: string | string[];
  };
}

export interface WebDavSourceInput {
  id?: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  enabled?: boolean;
  paths?: {
    MUSIC?: string | string[];
    AUDIOBOOK?: string | string[];
    MV?: string | string[];
  };
}

export interface WebDavTestResult {
  success: boolean;
  message: string;
  details?: Record<string, { success: boolean; message: string }>;
}

export const getWebDavSources = async () => {
  return request.get<ISuccessResponse<WebDavSource[]>>("/admin/webdav-sources");
};

export const saveWebDavSources = async (sources: WebDavSourceInput[]) => {
  return request.post<ISuccessResponse<WebDavSource[]>>(
    "/admin/webdav-sources",
    {
      sources,
    },
  );
};

export const testWebDavConnection = async (source: WebDavSourceInput) => {
  return request.post<ISuccessResponse<WebDavTestResult>>(
    "/admin/webdav-sources/test",
    source,
  );
};

export const triggerWebDavSync = async () => {
  return request.post<ISuccessResponse<{ id: string }>>("/admin/webdav-sync");
};
