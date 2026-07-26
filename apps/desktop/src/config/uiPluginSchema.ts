/**
 * UI 主题插件（JSON）标准 v1。
 *
 * 设计原则：
 * 1. 部分覆盖：缺省键回退应用默认，未来扩展只增不改，旧主题永远可用。
 * 2. unknown keys 不剥离、不报错，保留在存储里以便升级后自动生效。
 * 3. 通过 `meta.schemaVersion` 处理未来可能的破坏性升级。
 *
 * 文档：apps/desktop/docs/ui-theme-schema.md
 */

export const SCHEMA_VERSION = 1;

/** 命名空间白名单 —— 扩展点：以后加新页面只在这里 + 注册键表 + less 变量 */
export const COMPONENT_NAMESPACES = ["header", "player", "home", "detail"] as const;
export type ComponentNamespace = (typeof COMPONENT_NAMESPACES)[number];

/** 全局键 → antd token 名映射（global 段注入 ConfigProvider） */
export const GLOBAL_TO_ANTD_TOKEN: Record<string, string> = {
  colorPrimary: "colorPrimary",
  colorBgBase: "colorBgBase",
  colorBgContainer: "colorBgContainer",
  colorText: "colorText",
  colorTextSecondary: "colorTextSecondary",
  colorBorder: "colorBorder",
  borderRadius: "borderRadius",
  fontFamily: "fontFamily",
};

/**
 * 每命名空间可调键 + 对应 CSS 变量。
 * type: 'color' 用于颜色粗检；'px' 用于纯数字（px）；'string' 任意字符串值；'enum' 受 values 列表约束。
 */
type KeySpec =
  | { cssVar: string; type: "color" | "px" | "string" }
  | { cssVar: string; type: "enum"; values: readonly string[] }
  | { cssVar: string; type: "ratio" };

export const COMPONENT_KEYS: Record<
  ComponentNamespace,
  Record<string, KeySpec>
> = {
  header: {
    background: { cssVar: "--ad-header-bg", type: "color" },
    blur: { cssVar: "--ad-header-blur", type: "px" },
    textColor: { cssVar: "--ad-header-text", type: "color" },
    activeColor: { cssVar: "--ad-header-active", type: "color" },
    border: { cssVar: "--ad-header-border", type: "color" },
  },
  player: {
    background: { cssVar: "--ad-player-bg", type: "color" },
    blur: { cssVar: "--ad-player-blur", type: "px" },
    textColor: { cssVar: "--ad-player-text", type: "color" },
    progressColor: { cssVar: "--ad-player-progress", type: "color" },
    controlColor: { cssVar: "--ad-player-control", type: "color" },
  },
  home: {
    background: { cssVar: "--ad-home-bg", type: "color" },
    cardBackground: { cssVar: "--ad-home-card-bg", type: "color" },
    cardHoverBackground: { cssVar: "--ad-home-card-hover-bg", type: "color" },
    titleColor: { cssVar: "--ad-home-title", type: "color" },
  },
  detail: {
    controlsBackground: { cssVar: "--ad-detail-controls-bg", type: "color" },
    controlsTextColor: { cssVar: "--ad-detail-controls-text", type: "color" },
    background: { cssVar: "--ad-detail-bg", type: "color" },
    blur: { cssVar: "--ad-detail-blur", type: "px" },
    lyricsAlign: {
      cssVar: "--ad-detail-lyrics-align",
      type: "enum",
      values: ["left", "center", "right"],
    },
    lyricsColumnRatio: {
      cssVar: "--ad-detail-lyrics-column-ratio",
      type: "ratio",
    },
    lyricsFontSize: {
      cssVar: "--ad-detail-lyrics-font-size",
      type: "px",
    },
    coverStyle: {
      cssVar: "--ad-detail-cover-style",
      type: "enum",
      values: ["square", "vinyl"],
    },
    tonearm: {
      cssVar: "--ad-detail-tonearm",
      type: "enum",
      values: ["none", "basic"],
    },
  },
};

/** TS 类型（供 store / hook 使用） */
export interface ThemeMeta {
  name: string;
  author?: string;
  version?: string;
  schemaVersion: number;
  description?: string;
  homepage?: string;
}

export type Mode = "light" | "dark";

/** 单模式 token —— 故意用宽松索引签名，把未来键保留在对象里 */
export interface ThemeTokens {
  global?: Record<string, unknown>;
  components?: { [ns in ComponentNamespace]?: Record<string, unknown> } & Record<
    string,
    Record<string, unknown>
  >;
}

export interface UiThemePlugin {
  meta: ThemeMeta;
  light?: ThemeTokens;
  dark?: ThemeTokens;
  [k: string]: unknown;
}

export type ValidationResult =
  | { ok: true; plugin: UiThemePlugin; warnings: string[] }
  | { ok: false; error: string };

// ---------- 校验 ----------

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR = /^rgba?\s*\(/i;
const HSL_COLOR = /^hsla?\s*\(/i;
const NAMED_COLOR =
  /^(transparent|currentColor|inherit|none|black|white|red|blue|green|yellow|orange|purple|pink|gray|grey|silver|gold|cyan|magenta|brown|lime|navy|teal|maroon|olive|aqua|fuchsia)$/i;

const GRADIENT = /^(linear|radial|conic)-gradient\s*\(/i;

function isColorLike(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim();
  return (
    HEX_COLOR.test(s) ||
    RGB_COLOR.test(s) ||
    HSL_COLOR.test(s) ||
    NAMED_COLOR.test(s) ||
    GRADIENT.test(s)
  );
}

function isPxLike(v: unknown): boolean {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10000;
}

function isRatioLike(v: unknown): boolean {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
}

export function validateUiTheme(json: unknown): ValidationResult {
  const warnings: string[] = [];

  if (!isObject(json)) {
    return { ok: false, error: "主题文件根必须是对象" };
  }

  const { meta, light, dark } = json;
  if (!isObject(meta)) {
    return { ok: false, error: "缺少 meta 段或格式错误" };
  }
  if (typeof meta.name !== "string" || !meta.name.trim()) {
    return { ok: false, error: "meta.name 必填且非空" };
  }
  if (meta.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `schemaVersion 不匹配：期望 ${SCHEMA_VERSION}，收到 ${meta.schemaVersion}`,
    };
  }

  // light / dark 可整个缺省
  const validateMode = (tokens: unknown, mode: Mode): ThemeTokens | undefined => {
    if (tokens === undefined) return undefined;
    if (!isObject(tokens)) {
      warnings.push(`${mode} 段不是对象，已忽略`);
      return undefined;
    }
    const out: ThemeTokens = {};
    if ("global" in tokens) {
      if (!isObject(tokens.global)) {
        warnings.push(`${mode}.global 不是对象，已忽略`);
      } else {
        const g: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(tokens.global)) {
          if (k in GLOBAL_TO_ANTD_TOKEN) {
            if (k === "borderRadius") {
              if (typeof v !== "number") {
                warnings.push(`${mode}.global.${k} 不是 number，已忽略`);
                continue;
              }
            } else if (k === "fontFamily") {
              if (typeof v !== "string") {
                warnings.push(`${mode}.global.${k} 不是 string，已忽略`);
                continue;
              }
            } else {
              if (!isColorLike(v)) {
                warnings.push(`${mode}.global.${k} 不是合法颜色，已忽略`);
                continue;
              }
            }
            g[k] = v;
          } else {
            warnings.push(`${mode}.global.${k} 是未知键，已保留`);
            g[k] = v;
          }
        }
        out.global = g;
      }
    }
    if ("components" in tokens && tokens.components !== undefined) {
      if (!isObject(tokens.components)) {
        warnings.push(`${mode}.components 不是对象，已忽略`);
      } else {
        const comps: ThemeTokens["components"] = {};
        for (const [ns, kvs] of Object.entries(tokens.components)) {
          if (!isObject(kvs)) {
            warnings.push(`${mode}.components.${ns} 不是对象，已忽略`);
            continue;
          }
          const nsEntry: Record<string, unknown> = {};
          const keyTable = (COMPONENT_KEYS as Record<string, Record<string, { type: string }>>)[ns];
          for (const [k, v] of Object.entries(kvs)) {
            if (!keyTable) {
              warnings.push(`${mode}.components.${ns}.${k} 命名空间未注册，已保留`);
              nsEntry[k] = v;
              continue;
            }
            const spec = keyTable[k];
            if (!spec) {
              warnings.push(`${mode}.components.${ns}.${k} 是未知键，已保留`);
              nsEntry[k] = v;
              continue;
            }
            if (spec.type === "color" && !isColorLike(v)) {
              warnings.push(`${mode}.components.${ns}.${k} 不是合法颜色，已忽略`);
              continue;
            }
            if (spec.type === "px" && !isPxLike(v)) {
              warnings.push(`${mode}.components.${ns}.${k} 不是非负数字，已忽略`);
              continue;
            }
            if (spec.type === "ratio" && !isRatioLike(v)) {
              warnings.push(`${mode}.components.${ns}.${k} 不是 0-1 范围的数字，已忽略`);
              continue;
            }
            if (spec.type === "enum") {
              const allowed = (spec as unknown as { values: readonly string[] }).values;
              if (typeof v !== "string" || !allowed.includes(v)) {
                warnings.push(
                  `${mode}.components.${ns}.${k} 取值 ${JSON.stringify(v)} 不在允许范围 ${JSON.stringify(allowed)}，已忽略`,
                );
                continue;
              }
            }
            nsEntry[k] = v;
          }
          comps[ns] = nsEntry;
        }
        out.components = comps;
      }
    }
    return out;
  };

  const plugin: UiThemePlugin = {
    meta: {
      name: meta.name.trim(),
      author: typeof meta.author === "string" ? meta.author : undefined,
      version: typeof meta.version === "string" ? meta.version : undefined,
      schemaVersion: meta.schemaVersion,
      description: typeof meta.description === "string" ? meta.description : undefined,
      homepage: typeof meta.homepage === "string" ? meta.homepage : undefined,
    },
    light: validateMode(light, "light"),
    dark: validateMode(dark, "dark"),
  };

  return { ok: true, plugin, warnings };
}