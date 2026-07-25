jest.mock('../services/import', () => ({ ImportService: class ImportService {} }));

import { ForbiddenException } from '@nestjs/common';
import { FileSourcesController } from './file-sources.controller';

const makeResolved = (overrides: Partial<{
  musicDirs: string[];
  audiobookDirs: string[];
  mvDirs: string[];
  txtDirs: string[];
}> = {}) => ({
  musicDirs: ['/music'],
  audiobookDirs: ['/audio'],
  mvDirs: ['/mv'],
  txtDirs: [],
  ...overrides,
});

const makeSources = (overrides: Partial<{
  musicDirs: string[];
  audiobookDirs: string[];
  mvDirs: string[];
  txtDirs: string[];
}> = {}) => ({
  musicDirs: ['/music'],
  audiobookDirs: ['/audio'],
  mvDirs: ['/mv'],
  txtDirs: [],
  ...overrides,
});

describe('FileSourcesController', () => {
  it('list returns 403 for non-admin', async () => {
    const userService = { getUserById: jest.fn().mockResolvedValue({ is_admin: false }) };
    const fileSources = { getSources: jest.fn() };
    const importService = { setupWatcher: jest.fn(), createTask: jest.fn() };
    const c = new FileSourcesController(userService as any, fileSources as any, importService as any);
    await expect(c.list({ user: { userId: 1 } } as any)).rejects.toThrow('需要管理员权限');
  });

  it('list returns 500 envelope on non-HttpException error', async () => {
    const userService = { getUserById: jest.fn().mockResolvedValue({ is_admin: true }) };
    const fileSources = { getSources: jest.fn().mockRejectedValue(new Error('db boom')) };
    const importService = { setupWatcher: jest.fn(), createTask: jest.fn() };
    const c = new FileSourcesController(userService as any, fileSources as any, importService as any);
    const res = await c.list({ user: { userId: 1 } } as any);
    expect(res).toEqual({ code: 500, message: 'db boom' });
  });

  it('save does not rebuild watcher when only txtDirs change', async () => {
    const userService = { getUserById: jest.fn().mockResolvedValue({ is_admin: true }) };
    const before = makeResolved();
    const after = makeResolved({ txtDirs: ['/txt'] });
    const fileSources = {
      snapshot: jest.fn(),
      getResolved: jest.fn()
        .mockResolvedValueOnce(before) // previousResolved before save
        .mockResolvedValueOnce(after), // currentResolved after save
      save: jest.fn().mockResolvedValue(undefined),
      getSources: jest.fn().mockResolvedValue({ sources: makeSources(), exists: {} as any }),
    };
    const setupWatcher = jest.fn();
    const applyFileSourcesChanges = jest.fn().mockResolvedValue(undefined);
    const importService = { setupWatcher, applyFileSourcesChanges, createTask: jest.fn() };
    const c = new FileSourcesController(userService as any, fileSources as any, importService as any);

    const res = await c.save(
      { user: { userId: 1 } } as any,
      { ...makeSources(), txtDirs: ['/txt'] },
    );

    expect(setupWatcher).not.toHaveBeenCalled();
    expect(applyFileSourcesChanges).toHaveBeenCalledWith(before, after);
    expect((res as any).code).toBe(200);
  });

  it('save rebuilds watcher when music roots change and passes resolved arrays', async () => {
    const userService = { getUserById: jest.fn().mockResolvedValue({ is_admin: true }) };
    const before = makeResolved({ musicDirs: ['/music'] });
    const after = makeResolved({ musicDirs: ['/music2'] });
    const fileSources = {
      snapshot: jest.fn(),
      getResolved: jest.fn()
        .mockResolvedValueOnce(before)
        .mockResolvedValueOnce(after),
      save: jest.fn().mockResolvedValue(undefined),
      getSources: jest.fn().mockResolvedValue({ sources: makeSources(), exists: {} as any }),
    };
    const setupWatcher = jest.fn();
    const applyFileSourcesChanges = jest.fn().mockResolvedValue(undefined);
    const importService = { setupWatcher, applyFileSourcesChanges, createTask: jest.fn() };
    const c = new FileSourcesController(userService as any, fileSources as any, importService as any);

    await c.save({ user: { userId: 1 } } as any, makeSources({ musicDirs: ['/music2'] }));

    expect(setupWatcher).toHaveBeenCalledWith(
      after.musicDirs,
      after.audiobookDirs,
      after.mvDirs,
      expect.any(String),
    );
    // Body was unnormalized ("/music2") but applyFileSourcesChanges must receive
    // the normalized/resolved arrays, not the raw body.
    expect(applyFileSourcesChanges).toHaveBeenCalledWith(before, after);
  });

  it('save returns 500 envelope (and lets settings persist) when applyFileSourcesChanges throws', async () => {
    const userService = { getUserById: jest.fn().mockResolvedValue({ is_admin: true }) };
    const before = makeResolved();
    const after = makeResolved({ mvDirs: [] });
    const fileSources = {
      snapshot: jest.fn(),
      getResolved: jest.fn()
        .mockResolvedValueOnce(before)
        .mockResolvedValueOnce(after),
      save: jest.fn().mockResolvedValue(undefined),
      getSources: jest.fn(),
    };
    const setupWatcher = jest.fn();
    const applyFileSourcesChanges = jest.fn().mockRejectedValue(new Error('disk full'));
    const importService = { setupWatcher, applyFileSourcesChanges, createTask: jest.fn() };
    const c = new FileSourcesController(userService as any, fileSources as any, importService as any);

    const res = await c.save({ user: { userId: 1 } } as any, makeSources({ mvDirs: [] }));
    expect(res).toEqual({
      code: 500,
      message: expect.stringContaining('保存成功'),
    });
    expect((res as any).message).toContain('disk full');
  });

  it('save still rethrows HttpException (ForbiddenException) for Nest filter to handle', async () => {
    const userService = { getUserById: jest.fn().mockResolvedValue({ is_admin: false }) };
    const fileSources = { getResolved: jest.fn(), save: jest.fn(), getSources: jest.fn() };
    const importService = { setupWatcher: jest.fn(), applyFileSourcesChanges: jest.fn(), createTask: jest.fn() };
    const c = new FileSourcesController(userService as any, fileSources as any, importService as any);
    await expect(c.save({ user: { userId: 1 } } as any, makeSources())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('sync returns 500 envelope on non-HttpException error', async () => {
    const userService = { getUserById: jest.fn().mockResolvedValue({ is_admin: true }) };
    const fileSources = { getResolved: jest.fn().mockRejectedValue(new Error('nope')) };
    const importService = { setupWatcher: jest.fn(), createTask: jest.fn() };
    const c = new FileSourcesController(userService as any, fileSources as any, importService as any);
    const res = await c.sync({ user: { userId: 1 } } as any);
    expect(res).toEqual({ code: 500, message: 'nope' });
  });
});