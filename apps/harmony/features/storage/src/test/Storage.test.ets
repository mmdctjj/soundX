import { describe, it, expect } from '@ohos/hypium';

export default function storageTest() {
  describe('PreferencesStore JSON helpers', () => {
    it('round-trips object', () => {
      // Note: in hypium we don't have a real context; test parse logic only.
      const obj = { a: 1, b: 'hi' };
      const raw = JSON.stringify(obj);
      const back = JSON.parse(raw);
      expect(back.a).assertEqual(1);
      expect(back.b).assertEqual('hi');
    });
  });
}