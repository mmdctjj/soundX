import { ISuccessResponse } from '../models';
import request from '../utils/request';

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

export const getFileSources = () =>
  request.get<any, ISuccessResponse<FileSourcesView>>('/admin/file-sources');

export const saveFileSources = (sources: FileSources) =>
  request.post<any, ISuccessResponse<FileSourcesView>>('/admin/file-sources', sources);

export const syncFileSources = () =>
  request.post<any, ISuccessResponse<{ taskId: string }>>('/admin/file-sources/sync');