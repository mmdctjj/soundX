import { describe, it, expect, beforeAll, afterAll } from '@ohos/hypium';

// In hypium, rdbStore and httpClient are real instances; this test is
// hermetic because we never call .init() — the service only writes via
// rdbStore.* (which throws if not initialised) so we monkey-patch the
// instance methods we need for this suite. To keep the test self-contained
// we test queue mechanics + emit semantics without going through RDB.

import { LikesHistoryService, type EventKind } from '../main/ets/services/LikesHistoryService';
import { authStore } from '../main/ets/context/AuthStore';
import { rdbStore } from 'features_storage';
import { httpClient } from 'features_network';

let svc: LikesHistoryService;
let sent: Array<{ url: string; body: object }>;
let rdCalls: Array<{ method: string; args: object }>;

beforeAll(() => {
  // monkey-patch rdbStore methods used by the service
  rdCalls = [];
  const rdbAny = rdbStore as unknown as Record<string, Function>;
  const wrap = (name: string) => (arg: object) => { rdCalls.push({ method: name, args: arg }); };
  rdbAny['likeTrack'] = wrap('likeTrack');
  rdbAny['unlikeTrack'] = wrap('unlikeTrack');
  rdbAny['likeAlbum'] = wrap('likeAlbum');
  rdbAny['unlikeAlbum'] = wrap('unlikeAlbum');
  rdbAny['upsertHistory'] = wrap('upsertHistory');
  rdbAny['listHistory'] = async (n: number) => [];
  rdbAny['listLikedTracks'] = async () => [];
  rdbAny['listLikedAlbums'] = async () => [];

  // monkey-patch httpClient.post to record calls and resolve
  sent = [];
  const httpAny = httpClient as unknown as Record<string, Function>;
  httpAny['post'] = async (url: string, body: object) => {
    sent.push({ url, body });
    return null;
  };

  // seed auth token
  (authStore as unknown as { state_: { token: string } }).state_ = { token: 'test-token' };

  svc = new LikesHistoryService();
  svc.stop(); // do not let the real interval tick during tests
});

afterAll(() => { svc.stop(); });

export default function likesHistoryTest() {
  describe('local-first', () => {
    it('likeTrack writes RDB immediately and emits event', async () => {
      const events: object[] = [];
      const off = svc.on('trackLike', (p) => events.push(p));
      await svc.likeTrack('t1');
      expect(rdCalls.some((c) => c.method === 'likeTrack')).assertEqual(true);
      expect(events.length).assertEqual(1);
      off();
    });
  });

  describe('drain', () => {
    it('flushes queue to server with correct endpoints', async () => {
      sent = [];
      await svc.likeTrack('t2');
      await svc.likeAlbum('a1');
      await svc.recordHistory({ track_id: 't2', progress: 12000, source: null });
      expect(svc.queueSize()).assertEqual(3);
      await svc.drain();
      expect(svc.queueSize()).assertEqual(0);
      expect(sent.map((s) => s.url).sort())
        .assertEqual(['/likes/album', '/likes/track', '/track-history']);
    });

    it('clears queue and warns when no auth token', async () => {
      sent = [];
      (authStore as unknown as { state_: { token: string | null } }).state_ = { token: null };
      await svc.likeTrack('t3');
      expect(svc.queueSize()).assertEqual(1);
      await svc.drain();
      expect(svc.queueSize()).assertEqual(0);
      expect(sent.length).assertEqual(0);
      (authStore as unknown as { state_: { token: string } }).state_ = { token: 'test-token' };
    });
  });
}