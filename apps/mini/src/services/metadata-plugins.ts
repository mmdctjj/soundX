import { ISuccessResponse } from '../models';
import request from '../utils/request';

export type MetadataPluginType = 'http' | 'executable' | 'builtin';
export type MetadataPluginTrackType = 'music' | 'audiobook' | 'mv';

export interface MetadataPluginConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  type: MetadataPluginType;
  endpoint?: string;
  command?: string;
  timeout?: number;
  retry?: number;
  filter?: {
    types?: MetadataPluginTrackType[];
    pathPattern?: string;
  };
}

export const getMetadataPlugins = () => {
  return request.get<any, ISuccessResponse<MetadataPluginConfig[]>>(
    '/admin/metadata-plugins',
  );
};

export const saveMetadataPlugins = (plugins: MetadataPluginConfig[]) => {
  return request.put<any, ISuccessResponse<MetadataPluginConfig[]>>(
    '/admin/metadata-plugins',
    { plugins },
  );
};

export const deleteMetadataPlugin = (id: string) => {
  return request.delete<any, ISuccessResponse<{ id: string }>>(
    `/admin/metadata-plugins/${id}`,
  );
};

export const reloadMetadataPlugins = () => {
  return request.post<any, ISuccessResponse<MetadataPluginConfig[]>>(
    '/admin/metadata-plugins/reload',
  );
};

/**
 * Global policy for resolving conflicts between embedded file metadata and
 * plugin-returned metadata.
 * - 'plugin': plugin values overwrite embedded values (default).
 * - 'embedded': embedded values are kept; the plugin only fills missing fields.
 */
export type MetadataPriority = 'plugin' | 'embedded';

export const getMetadataPluginPriority = () => {
  return request.get<any, ISuccessResponse<MetadataPriority>>(
    '/admin/metadata-plugins/priority',
  );
};

export const setMetadataPluginPriority = (metadataPriority: MetadataPriority) => {
  return request.put<any, ISuccessResponse<MetadataPriority>>(
    '/admin/metadata-plugins/priority',
    { metadataPriority },
  );
};
