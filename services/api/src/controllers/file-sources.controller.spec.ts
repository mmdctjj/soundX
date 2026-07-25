jest.mock('../services/import', () => ({ ImportService: class ImportService {} }));

import { FileSourcesController } from './file-sources.controller';

const makeRes = () => ({ code: jest.fn().mockReturnThis(), json: jest.fn() });

describe('FileSourcesController', () => {
  it('list returns 403 for non-admin', async () => {
    const userService = { getUserById: jest.fn().mockResolvedValue({ is_admin: false }) };
    const fileSources = { getSources: jest.fn() };
    const importService = { setupWatcher: jest.fn(), createTask: jest.fn() };
    const c = new FileSourcesController(userService as any, fileSources as any, importService as any);
    await expect(c.list({ user: { userId: 1 } } as any)).rejects.toThrow('需要管理员权限');
  });
});
