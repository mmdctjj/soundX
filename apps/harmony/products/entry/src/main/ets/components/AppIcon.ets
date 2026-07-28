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
  | 'heart';

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
};

export function getIconResource(name: AppIconName): Resource {
  return ICON_MAP[name];
}

@Component
export struct AppIcon {
  @Prop name: AppIconName = 'plus';
  @Prop iconSize: number = 20;
  @Prop color: string = '#2c3e50';

  build() {
    SymbolGlyph(getIconResource(this.name))
      .fontSize(this.iconSize)
      .fontColor([this.color])
  }
}