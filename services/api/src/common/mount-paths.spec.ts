import {
  __resetMountMapsForTest,
  __setReadMountInfoForTest,
  containerToHost,
  hostToContainer,
} from './mount-paths';

const SAMPLE_MOUNTINFO = [
  '40 26 0:23 / /sys rw,nosuid,nodev,noexec,relatime - sysfs sysfs rw',
  '60 1 252:1 /volume1/迅雷下载/音乐 /music rw,relatime - ext4 /dev/sda1 rw',
  '61 1 252:1 /volume1/迅雷下载/MV /mv rw,relatime - ext4 /dev/sda1 rw',
  '62 1 252:1 /volume1/迅雷下载/有声书 /audio rw,relatime - ext4 /dev/sda1 rw',
  '63 1 252:1 /volume1/迅雷下载/TXT /txt rw,relatime - ext4 /dev/sda1 rw',
  '70 60 252:1 /volume1/迅雷下载/音乐/有声书 /music/audiobook rw,relatime - ext4 /dev/sda1 rw',
].join('\n');

describe('mount-paths', () => {
  beforeEach(() => {
    __resetMountMapsForTest();
    __setReadMountInfoForTest(() => SAMPLE_MOUNTINFO);
  });

  afterEach(() => {
    __resetMountMapsForTest();
    __setReadMountInfoForTest(() => '');
  });

  it('translates container → host for direct mounts', () => {
    expect(containerToHost('/music')).toBe('/volume1/迅雷下载/音乐');
    expect(containerToHost('/mv')).toBe('/volume1/迅雷下载/MV');
    expect(containerToHost('/audio')).toBe('/volume1/迅雷下载/有声书');
    expect(containerToHost('/txt')).toBe('/volume1/迅雷下载/TXT');
  });

  it('translates container → host for nested paths', () => {
    // /music/foo.mp3 should resolve to /volume1/迅雷下载/音乐/foo.mp3
    expect(containerToHost('/music/foo.mp3')).toBe(
      '/volume1/迅雷下载/音乐/foo.mp3',
    );
    // /music/audiobook/0.mp3 should resolve to the nested mount source
    expect(containerToHost('/music/audiobook/0.mp3')).toBe(
      '/volume1/迅雷下载/音乐/有声书/0.mp3',
    );
  });

  it('returns input unchanged when no matching mount', () => {
    expect(containerToHost('/some/random/path')).toBe('/some/random/path');
  });

  it('translates host → container', () => {
    expect(hostToContainer('/volume1/迅雷下载/音乐')).toBe('/music');
    expect(hostToContainer('/volume1/迅雷下载/音乐/foo.mp3')).toBe(
      '/music/foo.mp3',
    );
    expect(hostToContainer('/volume1/迅雷下载/音乐/有声书/0.mp3')).toBe(
      '/music/audiobook/0.mp3',
    );
  });

  it('host → container returns input unchanged when no match', () => {
    expect(hostToContainer('/no/such/path')).toBe('/no/such/path');
  });

  it('ignores virtual filesystems (proc, sysfs, tmpfs, overlay, ...)', () => {
    // proc and sysfs lines in the sample should not pollute the map
    expect(containerToHost('/proc/1/root')).toBe('/proc/1/root');
    expect(containerToHost('/sys/class')).toBe('/sys/class');
  });
});
