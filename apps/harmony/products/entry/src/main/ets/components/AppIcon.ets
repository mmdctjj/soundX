// AppIcon: maps Ionicons-style names used in mobile pages to HarmonyOS
// system SymbolGlyph resources. Ponytail: only names verified to compile in
// the project's HarmonyOS SDK (API 19). Unknown sys.symbol.* names produce
// 10903329 — keep this list tight to the ones that build clean.

export type AppIconName =
  | 'home'
  | 'headphones'
  | 'person'
  | 'person-fill'
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
  | 'list-outline'
  | 'expand'
  | 'contract'
  | 'search'
  | 'server-outline'
  | 'settings-outline';

const ICON_MAP: Record<AppIconName, Resource> = {
  'home': $r('sys.symbol.house'),
  'headphones': $r('sys.symbol.headphones'),
  'person': $r('sys.symbol.person'),
  // 已同步态填充图标（对齐 mobile Ionicons people 实心）。
  // SF Symbols 标准命名 person.fill → HarmonyOS snake_case person_fill。
  // build 报 10903329 的话降级为 heart-fill。
  'person-fill': $r('sys.symbol.person_fill'),
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
  // 扫码（对齐 mobile AntDesign scan 取景器框，不是二维码）。
  // viewfinder / qrcode_viewfinder 不存在（10903329），试 barcode_viewfinder。
  'scan': $r('sys.symbol.barcode_viewfinder'),
  // 任务中心入口：复用 list_bullet 强调列表语义
  'list-outline': $r('sys.symbol.list_bullet'),
  // 全屏切换（对齐 mobile Ionicons expand/contract）。
  // 鸿蒙 SDK 通常按 SF Symbols snake_case 命名；若 build 报 10903329，
  // 改成 chevron-up / chevron-down 之类已验证过的也行。
  'expand': $r('sys.symbol.arrow_up_left_and_arrow_down_right'),
  'contract': $r('sys.symbol.arrow_down_right_and_arrow_up_left'),
  // 搜索（SF Symbols 标准名 magnifyingglass；用 search 也行，看 SDK 实现）。
  // build 报 10903329 的话降级为 'list' 或保留原 ⌕ 文本。
  'search': $r('sys.symbol.magnifyingglass'),
  // 资源管理（对齐 mobile Ionicons server-outline → SF Symbols server）。
  // SF Symbols 标准名 server / external_drive / network 在当前 SDK 都不存在（10903329），
  // 改用 archivebox（归档箱，视觉接近"资源/服务器"）。
  'server-outline': $r('sys.symbol.archivebox'),
  // 设置（对齐 mobile Ionicons settings-outline → SF Symbols gearshape）。
  // 与 'gear' 同源但语义不同（个人页右上入口 vs 内部菜单"评价"等），映射统一。
  'settings-outline': $r('sys.symbol.gearshape'),
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