import request from "./request";
import type { ISuccessResponse } from "./models";

export type MetadataPluginType = "http" | "executable" | "builtin";
export type MetadataPluginTrackType = "music" | "audiobook" | "mv";

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

export interface MetadataPluginInput extends Partial<MetadataPluginConfig> {}

/**
 * Global policy for resolving conflicts between embedded file metadata and
 * plugin-returned metadata.
 * - "plugin": plugin values overwrite embedded values (default).
 * - "embedded": embedded values are kept; the plugin only fills missing fields.
 */
export type MetadataPriority = "plugin" | "embedded";

export const getMetadataPlugins = async () => {
  return request.get<ISuccessResponse<MetadataPluginConfig[]>>(
    "/admin/metadata-plugins",
  );
};

export const saveMetadataPlugins = async (plugins: MetadataPluginConfig[]) => {
  return request.put<ISuccessResponse<MetadataPluginConfig[]>>(
    "/admin/metadata-plugins",
    { plugins },
  );
};

export const createMetadataPlugin = async (plugin: MetadataPluginConfig) => {
  return request.post<ISuccessResponse<MetadataPluginConfig>>(
    "/admin/metadata-plugins",
    plugin,
  );
};

export const updateMetadataPlugin = async (
  id: string,
  patch: Partial<MetadataPluginConfig>,
) => {
  return request.patch<ISuccessResponse<MetadataPluginConfig>>(
    `/admin/metadata-plugins/${id}`,
    patch,
  );
};

export const deleteMetadataPlugin = async (id: string) => {
  return request.delete<ISuccessResponse<{ id: string }>>(
    `/admin/metadata-plugins/${id}`,
  );
};

export const reloadMetadataPlugins = async () => {
  return request.post<ISuccessResponse<MetadataPluginConfig[]>>(
    "/admin/metadata-plugins/reload",
  );
};

export const getMetadataPluginPriority = async () => {
  return request.get<ISuccessResponse<MetadataPriority>>(
    "/admin/metadata-plugins/priority",
  );
};

export const setMetadataPluginPriority = async (
  metadataPriority: MetadataPriority,
) => {
  return request.put<ISuccessResponse<MetadataPriority>>(
    "/admin/metadata-plugins/priority",
    { metadataPriority },
  );
};
