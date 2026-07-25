import { FileSourcesService } from './file-sources.service';

describe('FileSourcesService', () => {
  // 不打 DB，纯单元
  it('buildFromEnv reads env when present', () => {
    process.env.MUSIC_BASE_DIR = '/tmp/m1;/tmp/m2';
    process.env.AUDIO_BOOK_DIR = '';
    const svc = new FileSourcesService();
    const r = (svc as any).buildFromEnv();
    expect(r.musicDirs).toEqual(['/tmp/m1;/tmp/m2']); // 原始输入，未解析
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
});
