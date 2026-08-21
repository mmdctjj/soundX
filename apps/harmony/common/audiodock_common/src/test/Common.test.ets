import { describe, it, expect } from '@ohos/hypium';
import { formatDuration, formatSize, djb2 } from '../main/ets/utils/format';
import { djb2 as djb2hash } from '../main/ets/utils/hash';

export default function commonTest() {
  describe('formatDuration', () => {
    it('formats ms < 1min', () => {
      expect(formatDuration(45000)).assertEqual('0:45');
    });
    it('formats min:sec', () => {
      expect(formatDuration(125000)).assertEqual('2:05');
    });
    it('formats h:mm:ss', () => {
      expect(formatDuration(3661000)).assertEqual('1:01:01');
    });
  });

  describe('formatSize', () => {
    it('formats bytes', () => {
      expect(formatSize(500)).assertEqual('500 B');
    });
    it('formats MB', () => {
      expect(formatSize(5 * 1024 * 1024)).assertEqual('5.0 MB');
    });
  });

  describe('djb2', () => {
    it('produces same hash for same input', () => {
      expect(djb2hash('https://x.com/a.jpg')).assertEqual(djb2('https://x.com/a.jpg'));
    });
  });
}