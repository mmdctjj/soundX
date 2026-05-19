export const PLUGIN_ENGINE = "audiodock-visual-plugin";
export const PLUGIN_ENGINE_VERSION = "1.0.0";

export type PluginCapability = "theme" | "cover" | "lyrics" | "animation";

export interface VisualPluginManifest {
  id: string;
  name: string;
  version: string;
  author?: string;
  engine: string;
  engineVersion: string;
  capabilities: PluginCapability[];
  entry: {
    tokens: string;
    mobileMapping?: string;
    desktopMapping?: string;
  };
  signature?: string;
}

export interface VisualPluginTokens {
  color?: Record<string, string>;
  cover?: {
    radius?: number;
    borderWidth?: number;
    borderColor?: string;
    shadowOpacity?: number;
    shadowRadius?: number;
  };
  lyrics?: {
    activeColor?: string;
    inactiveColor?: string;
    activeScale?: number;
    inactiveOpacity?: number;
    fontWeightActive?: string;
    fontWeightInactive?: string;
  };
  motion?: {
    spring?: { friction?: number; tension?: number };
  };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseManifest(input: unknown): VisualPluginManifest {
  if (!isObject(input)) {
    throw new Error("manifest must be an object");
  }
  return input as VisualPluginManifest;
}

export function validateSchema(manifest: VisualPluginManifest): string[] {
  const errors: string[] = [];
  if (!manifest.id) errors.push("manifest.id is required");
  if (!manifest.name) errors.push("manifest.name is required");
  if (!manifest.version) errors.push("manifest.version is required");
  if (manifest.engine !== PLUGIN_ENGINE) {
    errors.push(`manifest.engine must be ${PLUGIN_ENGINE}`);
  }
  if (!manifest.entry?.tokens) {
    errors.push("manifest.entry.tokens is required");
  }
  if (!Array.isArray(manifest.capabilities)) {
    errors.push("manifest.capabilities must be an array");
  }
  return errors;
}

export function mergeWithBaseTheme<T extends Record<string, any>>(baseTheme: T, pluginOverride?: Partial<T>): T {
  if (!pluginOverride) return baseTheme;
  return { ...baseTheme, ...pluginOverride };
}

export interface MobileVisualConfig {
  themeColors: Record<string, string>;
  cover: Required<NonNullable<VisualPluginTokens["cover"]>>;
  lyrics: Required<NonNullable<VisualPluginTokens["lyrics"]>>;
  motion: {
    spring: { friction: number; tension: number };
  };
}

export interface DesktopVisualConfig {
  cssVariables: Record<string, string>;
  desktopLyricOverride: {
    fontColor?: string;
    fontWeight?: number;
  };
}

export function compileForMobile(tokens: VisualPluginTokens): MobileVisualConfig {
  return {
    themeColors: tokens.color ?? {},
    cover: {
      radius: tokens.cover?.radius ?? 24,
      borderWidth: tokens.cover?.borderWidth ?? 0,
      borderColor: tokens.cover?.borderColor ?? "transparent",
      shadowOpacity: tokens.cover?.shadowOpacity ?? 0.25,
      shadowRadius: tokens.cover?.shadowRadius ?? 12,
    },
    lyrics: {
      activeColor: tokens.lyrics?.activeColor ?? "#ffffff",
      inactiveColor: tokens.lyrics?.inactiveColor ?? "#aaaaaa",
      activeScale: tokens.lyrics?.activeScale ?? 1.1,
      inactiveOpacity: tokens.lyrics?.inactiveOpacity ?? 0.4,
      fontWeightActive: tokens.lyrics?.fontWeightActive ?? "800",
      fontWeightInactive: tokens.lyrics?.fontWeightInactive ?? "500",
    },
    motion: {
      spring: {
        friction: tokens.motion?.spring?.friction ?? 8,
        tension: tokens.motion?.spring?.tension ?? 40,
      },
    },
  };
}

export function compileForDesktop(tokens: VisualPluginTokens): DesktopVisualConfig {
  const cssVariables: Record<string, string> = {};
  Object.entries(tokens.color ?? {}).forEach(([key, value]) => {
    cssVariables[`--ad-color-${key}`] = value;
  });

  return {
    cssVariables,
    desktopLyricOverride: {
      fontColor: tokens.lyrics?.activeColor,
      fontWeight: tokens.lyrics?.fontWeightActive ? Number(tokens.lyrics.fontWeightActive) : undefined,
    },
  };
}
