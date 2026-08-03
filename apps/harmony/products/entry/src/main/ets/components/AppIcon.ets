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
  | 'gear';

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
  // sys.symbol.music_note 在当前 SDK 不存在（10903329），复用已验证的音符字形
  'music-note': $r('sys.symbol.music_note_list'),
  'shuffle': $r('sys.symbol.shuffle'),
  'repeat': $r('sys.symbol.repeat'),
  'repeat-once': $r('sys.symbol.repeat_1'),
  'gear': $r('sys.symbol.gearshape'),
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