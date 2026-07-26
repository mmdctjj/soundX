import { ISuccessResponse } from '../models';
import request from '../utils/request';

export type WebDavPathKind = 'MUSIC' | 'AUDIOBOOK' | 'MV';

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

export const getWebDavSources = () => {
  return request.get<any, ISuccessResponse<WebDavSource[]>>('/admin/webdav-sources');
};

export const saveWebDavSources = (sources: WebDavSourceInput[]) => {
  return request.post<any, ISuccessResponse<WebDavSource[]>>('/admin/webdav-sources', {
    sources,
  });
};

export const testWebDavConnection = (source: WebDavSourceInput) => {
  return request.post<any, ISuccessResponse<WebDavTestResult>>(
    '/admin/webdav-sources/test',
    source,
  );
};

export const triggerWebDavSync = () => {
  return request.post<any, ISuccessResponse<{ id: string }>>('/admin/webdav-sync');
};
