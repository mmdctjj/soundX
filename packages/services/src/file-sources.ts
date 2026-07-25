import request from './request';
import type { ISuccessResponse } from './models';

export interface FileSources {
  musicDirs: string[];
  audiobookDirs: string[];
  mvDirs: string[];
  txtDirs: string[];
}

export type FileSourcesExists = Record<keyof FileSources, boolean[]>;
export interface FileSourcesView {
  sources: FileSources;
  exists: FileSourcesExists;
}

export const getFileSources = async () => {
  return request.get<ISuccessResponse<FileSourcesView>>('/admin/file-sources');
};

export const saveFileSources = async (sources: FileSources) => {
  return request.post<ISuccessResponse<FileSourcesView>>('/admin/file-sources', sources);
};

export const syncFileSources = async () => {
  return request.post<ISuccessResponse<{ taskId: string }>>('/admin/file-sources/sync');
};