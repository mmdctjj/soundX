import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type UiThemePlugin,
  validateUiTheme,
  type ValidationResult,
} from "../config/uiPluginSchema";

interface UiThemeState {
  /** id → 已导入主题（含原始 unknown 字段，零剥离） */
  themes: Record<string, UiThemePlugin>;
  /** id 顺序，便于 UI 展示 */
  order: string[];
  activeId: string | null;

  importTheme: (jsonText: string, fileName?: string) => ValidationResult & { id?: string };
  removeTheme: (id: string) => void;
  setActive: (id: string | null) => void;
}

const STORAGE_KEY = "soundx-ui-themes";

/** id 生成：基于 meta.name + 一个 8 位随机后缀，避免同名校验冲突 */
const newId = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 32) || "theme"}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

export const useUiThemeStore = create<UiThemeState>()(
  persist(
    (set, get) => ({
      themes: {},
      order: [],
      activeId: null,

      importTheme: (jsonText, fileName) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonText);
        } catch (e) {
          return { ok: false, error: `JSON 解析失败：${(e as Error).message}` };
        }
        const result = validateUiTheme(parsed);
        if (!result.ok) return result;

        const id = newId(fileName || result.plugin.meta.name);
        set((state) => ({
          themes: { ...state.themes, [id]: result.plugin },
          order: state.order.includes(id) ? state.order : [...state.order, id],
        }));
        return { ...result, id };
      },

      removeTheme: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.themes;
          void _;
          return {
            themes: rest,
            order: state.order.filter((x) => x !== id),
            activeId: state.activeId === id ? null : state.activeId,
          };
        }),

      setActive: (id) => {
        if (id !== null && !get().themes[id]) return;
        set({ activeId: id });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
    },
  ),
);

/** 取当前激活主题。mode 保留参数是为对称，未来按模式筛选用得着；当前未消费。 */
export const getActivePlugin = (mode: "light" | "dark"): UiThemePlugin | null => {
  void mode;
  const { activeId, themes } = useUiThemeStore.getState();
  if (!activeId) return null;
  const t = themes[activeId];
  return t ?? null;
};