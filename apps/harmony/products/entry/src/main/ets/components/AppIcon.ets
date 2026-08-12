// AppIcon: maps Ionicons-style names used in mobile pages to HarmonyOS
// system SymbolGlyph resources. Ponytail: only names verified to compile in
// the project's HarmonyOS SDK (API 19). Unknown sys.symbol.* names produce
// 10903329 — keep this list tight to the ones that build clean.

export type AppIconName =
  | 'home'
  | 'headphones'
  | 'person'
  | 'folder'
  | 'camera'
  | 'crown'
  | 'radio'
  | 'arrow-clockwise'
  | 'plus'
  | 'heart'
  | 'heart-fill'
  | 'play'
  | 'pause'
  | 'skip-back'
  | 'skip-forward'
  | 'chevron-down'
  | 'list'
  | 'playlist'
  | 'music-note'
  | 'shuffle'
  | 'repeat'
  | 'repeat-once'
  | 'gear'
  | 'close'
  | 'arrow-up'
  | 'arrow-down'
  | 'locate'
  | 'cloud-download'
  | 'volume-high'
  | 'refresh'
  | 'trash'
  | 'document'
  | 'chevron-back'
  | 'arrow-forward'
  | 'checkbox'
  | 'square-outline'
  | 'scan'
  | 'list-outline';

const ICON_MAP: Record<AppIconName, Resource> = {
  'home': $r('sys.symbol.house'),
  'headphones': $r('sys.symbol.headphones'),
  'person': $r('sys.symbol.person'),
  'folder': $r('sys.symbol.folder'),
  'camera': $r('sys.symbol.camera'),
  'crown': $r('sys.symbol.crown'),
  'radio': $r('sys.symbol.radio'),
  'arrow-clockwise': $r('sys.symbol.arrow_clockwise'),
  'plus': $r('sys.symbol.plus'),
  'heart': $r('sys.symbol.heart'),
  'heart-fill': $r('sys.symbol.heart_fill'),
  'play': $r('sys.symbol.play_fill'),
  'pause': $r('sys.symbol.pause_fill'),
  'skip-back': $r('sys.symbol.backward_end_fill'),
  'skip-forward': $r('sys.symbol.forward_end_fill'),
  'chevron-down': $r('sys.symbol.chevron_down'),
  'list': $r('sys.symbol.list_bullet'),
  'playlist': $r('sys.symbol.music_note_list'),
  // sys.symbol.music_note 在当前 SDK 不存在（10903329），sys.symbol.music 为纯音乐符号
  'music-note': $r('sys.symbol.music'),
  'shuffle': $r('sys.symbol.shuffle'),
  'repeat': $r('sys.symbol.repeat'),
  'repeat-once': $r('sys.symbol.repeat_1'),
  'gear': $r('sys.symbol.gearshape'),
  'close': $r('sys.symbol.xmark'),
  'arrow-up': $r('sys.symbol.arrow_up'),
  'arrow-down': $r('sys.symbol.arrow_down'),
  'locate': $r('sys.symbol.scope'),
  'cloud-download': $r('sys.symbol.icloud'),
  'volume-high': $r('sys.symbol.speaker_wave_3_fill'),
  'refresh': $r('sys.symbol.arrow_clockwise'),
  'trash': $r('sys.symbol.trash'),
  'document': $r('sys.symbol.doc'),
  'chevron-back': $r('sys.symbol.chevron_left'),
  'arrow-forward': $r('sys.symbol.arrow_right'),
  'checkbox': $r('sys.symbol.checkmark_square_fill'),
  'square-outline': $r('sys.symbol.square'),
  // 二维码扫描：当前 SDK sys.symbol.qrcode 验证过可编译；若不行可换 scope
  'scan': $r('sys.symbol.qrcode'),
  // 任务中心入口：复用 list_bullet 强调列表语义
  'list-outline': $r('sys.symbol.list_bullet'),
};

export function getIconResource(name: AppIconName): Resource {
  return ICON_MAP[name];
}

@Component
export struct AppIcon {
  @Prop name: AppIconName = 'plus';
  @Prop iconSize: number = 20;
  @Prop color: string = '#000000';

  build() {
    SymbolGlyph(getIconResource(this.name))
      .fontSize(this.iconSize)
      .fontColor([this.color])
  }
}