import { FileSourcesService } from './file-sources.service';
import {
  __resetMountMapsForTest,
  __setReadMountInfoForTest,
} from '../common/mount-paths';

describe('FileSourcesService', () => {
  beforeEach(() => {
    // The default test environment has no /proc/self/mountinfo, so mountinfo
    // is empty. Tests below use the *_HOST env vars to assert the explicit
    // path; reset between tests so leftover registrations don't bleed.
    __resetMountMapsForTest();
    __setReadMountInfoForTest(() => '');
  });
  afterEach(() => {
    __resetMountMapsForTest();
    __setReadMountInfoForTest(() => '');
    delete process.env.MUSIC_BASE_DIR;
    delete process.env.MUSIC_BASE_DIR_HOST;
    delete process.env.AUDIO_BOOK_DIR;
    delete process.env.AUDIO_BOOK_DIR_HOST;
    delete process.env.MV_BASE_DIR;
    delete process.env.MV_BASE_DIR_HOST;
    delete process.env.TXT_BASE_DIR;
    delete process.env.TXT_BASE_DIR_HOST;
  });

  // 不打 DB，纯单元
  it('buildFromEnv splits semicolon-separated values and applies host override per slot', () => {
    process.env.MUSIC_BASE_DIR = '/music/a;/music/b';
    process.env.MUSIC_BASE_DIR_HOST = '/volume1/迅雷下载/音乐A;/volume1/迅雷下载/音乐B';
    process.env.AUDIO_BOOK_DIR = '';
    const svc = new FileSourcesService();
    const r = (svc as any).buildFromEnv();
    expect(r.musicDirs).toEqual([
      '/volume1/迅雷下载/音乐A',
      '/volume1/迅雷下载/音乐B',
    ]);
    expect(r.audiobookDirs).toEqual([]);
  });

  it('buildFromEnv falls back to defaults when env missing', () => {
    delete process.env.MUSIC_BASE_DIR;
    delete process.env.AUDIO_BOOK_DIR;
    delete process.env.MV_BASE_DIR;
    delete process.env.TXT_BASE_DIR;
    const svc = new FileSourcesService();
    const r = (svc as any).buildFromEnv();
    expect(r.musicDirs).toEqual(['./music/music']);
    expect(r.audiobookDirs).toEqual(['./music/audio']);
    expect(r.mvDirs).toEqual(['./music/mv']);
    expect(r.txtDirs).toEqual([]); // TTS 端无 DEFAULT，走 []
  });

  it('buildFromEnv pairs TXT_BASE_DIR with TXT_BASE_DIR_HOST when both set', () => {
    process.env.TXT_BASE_DIR = '/txt';
    process.env.TXT_BASE_DIR_HOST = '/volume1/迅雷下载/TXT';
    const svc = new FileSourcesService();
    const r = (svc as any).buildFromEnv();
    expect(r.txtDirs).toEqual(['/volume1/迅雷下载/TXT']);
  });

  it('buildFromEnv falls back to mountinfo translation when *_HOST not set', () => {
    process.env.MUSIC_BASE_DIR = '/music';
    // Simulate mountinfo reporting the host path (root field) as it would
    // appear on a non-NAS docker host where the bind source is the full host
    // directory.
    __setReadMountInfoForTest(() =>
      '60 1 252:1 /volume1/迅雷下载/音乐 /music rw - ext4 /dev/sda1 rw\n',
    );
    const svc = new FileSourcesService();
    const r = (svc as any).buildFromEnv();
    expect(r.musicDirs).toEqual(['/volume1/迅雷下载/音乐']);
  });

  it('normalize trims, dedupes and drops empty entries', () => {
    const svc = new FileSourcesService();
    const r = (svc as any).normalize({
      musicDirs: ['  /a', '/a', '', ' /b'],
      audiobookDirs: [],
      mvDirs: [],
      txtDirs: [],
    });
    expect(r.musicDirs).toEqual(['/a', '/b']);
  });

  it('resolveDirs returns absolute paths via path.resolve', () => {
    const svc = new FileSourcesService();
    const r = (svc as any).resolveDirs({
      musicDirs: ['./relative'],
      audiobookDirs: [],
      mvDirs: [],
      txtDirs: [],
    });
    expect(r.musicDirs[0]).toMatch(/[/\\]relative$/);
  });

  it('registerHostEnvPairs registers every provided pair', () => {
    process.env.MUSIC_BASE_DIR = '/music';
    process.env.MUSIC_BASE_DIR_HOST = '/volume1/迅雷下载/音乐';
    process.env.MV_BASE_DIR = '/mv';
    process.env.MV_BASE_DIR_HOST = '/volume1/迅雷下载/MV';
    const svc = new FileSourcesService();
    (svc as any).registerHostEnvPairs();
    const { containerToHost, hostToContainer } = require('../common/mount-paths');
    expect(containerToHost('/music')).toBe('/volume1/迅雷下载/音乐');
    expect(hostToContainer('/volume1/迅雷下载/MV/sub.mp4')).toBe('/mv/sub.mp4');
  });
});
