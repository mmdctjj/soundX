# UI 主题插件（JSON）标准 v1

用户通过上传一个 JSON 文件，自定义 desktop 端的 UI 样式。  
本标准面向社区作者 —— 遵循这套规则写出的主题，能在新版 app 持续可用。

## 上手

1. 打开 **设置 → UI 主题**。
2. 点 **下载示例主题** 拿到 `audiodock-ui-theme.sample.json`，照着改。
3. 把改好的文件拖进上传区即可导入，点 **启用** 即生效。

## 兼容性契约（写给社区作者）

| 规则 | 说明 |
|---|---|
| 1 | `meta.schemaVersion` **必填**，且必须等于 app 当前支持的版本号（当前 = `1`）。若你上传的版本更高，app 会拒绝并提示。 |
| 2 | 任何 JSON 里出现的未知键，app **不会报错也不会剥离**，会保留在存储里。等你升级到支持这些键的新版 app 后，它们自动生效。 |
| 3 | 缺省键回退应用默认 —— 你只写想改的项即可。 |
| 4 | 颜色值接受任意合法 CSS 颜色（`#xxx`、`#xxxxxx`、`rgb/rgba(...)`、`hsl/hsla(...)`、`linear-gradient(...)` 等）。尺寸类键只接受非负数字（px）。枚举型键只接受 `values` 列表里的字符串。比例型键只接受 0-1 范围的数字。 |
| 5 | 扩展规则：**只增不改**。已经发布的键，名称和语义永远不变；要调整效果只能新增键。 |

## 标准结构

```jsonc
{
  "meta": {
    "name": "Midnight Glass",        // 必填，主题名
    "author": "someone",             // 可选
    "version": "1.0.0",              // 可选，主题自身版本号
    "schemaVersion": 1,              // 必填，标准版本（当前 = 1）
    "description": "...",            // 可选
    "homepage": "https://..."        // 可选
  },
  "light": { /* ThemeTokens，整个段可缺省 */ },
  "dark":  { /* ThemeTokens，整个段可缺省 */ }
}
```

`light` / `dark` 段任一可缺省，缺省时该模式完全回退默认主题。

## `ThemeTokens`

两层结构：

```jsonc
{
  "global": { /* 可选，影响全局（映射 antd token + 根背景） */ },
  "components": { /* 可选，按组件作用域（映射 --ad-* CSS 变量） */
    "header": { "background": "...", "blur": 24 },
    "player": { "background": "...", "progressColor": "..." },
    "home":   { "background": "...", "cardBackground": "..." },
    "detail": { "lyricsAlign": "left" }
  }
}
```

### `global` 段（可选键）

| 键 | 类型 | 对应 antd token | 说明 |
|---|---|---|---|
| `colorPrimary` | color | colorPrimary | 主色 |
| `colorBgBase` | color | colorBgBase | 页面根背景 |
| `colorBgContainer` | color | colorBgContainer | 卡片/容器背景 |
| `colorText` | color | colorText | 主文本 |
| `colorTextSecondary` | color | colorTextSecondary | 次文本 |
| `colorBorder` | color | colorBorder | 边框 |
| `borderRadius` | number | borderRadius | 圆角 (px) |
| `fontFamily` | string | fontFamily | 全局字体 |

### `components` 段

每命名空间下面都用一组固定键，键名都是 camelCase：

**`header`**（→ `--ad-header-*`）
| 键 | 类型 | CSS 变量 | 用途 |
|---|---|---|---|
| `background` | color | `--ad-header-bg` | Header 背景 |
| `blur` | number | `--ad-header-blur` | 背景模糊半径 (px) |
| `textColor` | color | `--ad-header-text` | 文本颜色 |
| `activeColor` | color | `--ad-header-active` | 焦点/激活态背景 |
| `border` | color | `--ad-header-border` | 通用边框/分隔线 |

**`player`**（→ `--ad-player-*`）
| 键 | 类型 | CSS 变量 |
|---|---|---|
| `background` | color | `--ad-player-bg` |
| `blur` | number | `--ad-player-blur` |
| `textColor` | color | `--ad-player-text` |
| `progressColor` | color | `--ad-player-progress` |
| `controlColor` | color | `--ad-player-control` |

**`home`**（→ `--ad-home-*`）
| 键 | 类型 | CSS 变量 |
|---|---|---|
| `background` | color | `--ad-home-bg` |
| `cardBackground` | color | `--ad-home-card-bg` |
| `cardHoverBackground` | color | `--ad-home-card-hover-bg` |
| `titleColor` | color | `--ad-home-title` |

**`detail`**（→ `--ad-detail-*`）
| 键 | 类型 | CSS 变量 | 取值 |
|---|---|---|---|
| `background` | color | `--ad-detail-bg` | 详情页背景 |
| `blur` | number | `--ad-detail-blur` | 详情页毛玻璃模糊半径 (px) |
| `controlsBackground` | color | `--ad-detail-controls-bg` | 详情页底部控制栏背景 |
| `controlsTextColor` | color | `--ad-detail-controls-text` | 详情页底部控制栏文字 |
| `lyricsAlign` | enum | `--ad-detail-lyrics-align` | `left` / `center` / `right` —— 歌词对齐（同时驱动文本对齐与歌词块对齐） |
| `lyricsColumnRatio` | ratio | `--ad-detail-lyrics-column-ratio` | 0-1 —— 歌词栏占全屏视图的宽度比例（封面占 `1 - lyricsColumnRatio`） |
| `lyricsFontSize` | px | `--ad-detail-lyrics-font-size` | 常规歌词字号 (px)。当前行自动 = 该值 + 2px |
| `coverStyle` | enum | `--ad-detail-cover-style` | `square` / `vinyl` —— 封面渲染样式（`vinyl` 为黑胶唱片：圆盘 + 沟纹 + 中央专辑标签） |
| `tonearm` | enum | `--ad-detail-tonearm` | `none` / `basic` —— 黑胶唱针装饰（仅在 `coverStyle: "vinyl"` 时显示）；播放时摆入贴盘，暂停时抬起 |

## 发布建议

- 主题名建议以你的作者前缀开头，方便社区检索，如 `acme-midnight-glass`。
- 不要删除或修改已经发布的键 —— 旧版 app 加载你的新版主题时会按"未知键保留"的策略兼容，但反过来不行。
- 一次只覆盖你想改的项；尽量小而精。
- `homepage` 字段填上你的 GitHub/社区帖链接，方便用户反馈。