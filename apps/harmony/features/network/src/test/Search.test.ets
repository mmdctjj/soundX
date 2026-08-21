import { describe, it, expect, beforeAll } from '@ohos/hypium';
import { httpClient } from '../main/ets/HarmonyHttpClient';

let postCalls: Array<{ url: string; body: object }>;
let getCalls: Array<{ url: string; params: object | undefined }>;

beforeAll(() => {
  postCalls = [];
  getCalls = [];
  const any = httpClient as unknown as Record<string, Function>;
  any['get'] = async (url: string, params?: object) => {
    getCalls.push({ url, params });
    return [];
  };
  any['post'] = async (url: string, body: object) => {
    postCalls.push({ url, body });
    return null;
  };
});

export default function searchTest() {
  describe('Promise.allSettled merge', () => {
    it('one failure does not block the others', async () => {
      const ok = Promise.resolve([{ id: '1' }]);
      const fail = Promise.reject(new Error('boom'));
      const results = await Promise.allSettled([ok, fail, ok]);
      expect(results[0].status).assertEqual('fulfilled');
      expect(results[1].status).assertEqual('rejected');
      expect(results[2].status).assertEqual('fulfilled');
    });
  });
}