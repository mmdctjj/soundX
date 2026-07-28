# Harmony 专辑/艺人详情页布局对齐 mobile — 设计

日期: 2026-07-28
分支: feat/hm
状态: 待实施

## 背景与目标

`apps/harmony` 的专辑详情页与艺人详情页布局与 `apps/mobile` 差距明显：没有封面、没有播放全部按钮、曲目行缺少序号与小封面，艺人页用子 tab 而非纵向区块。

目标：**以 mobile 为准**重写这两个页面的布局，并抽出可复用的展示组件。

参考实现：
- `apps/mobile/app/album/[id].tsx`
- `apps/mobile/app/artist/[id].tsx`

待修改：
- `apps/harmony/products/entry/src/main/ets/pages/AlbumDetailPage.ets`
- `apps/harmony/products/entry/src/main/ets/pages/ArtistDetailPage.ets`
- `apps/harmony/products/entry/src/main/ets/components/AppIcon.ets`（新增 play 图标）
- `apps/harmony/features/i18n/src/main/ets/I18n.ets`（前置修复占位符正则，见"文案"一节）

待新增：
- `apps/harmony/products/entry/src/main/ets/components/DetailHero.ets`
- `apps/harmony/products/entry/src/main/ets/components/SectionHeader.ets`
- `apps/harmony/products/entry/src/main/ets/components/AlbumCarouselCard.ets`
- `apps/harmony/products/entry/src/main/ets/components/TrackRow.ets`

## 范围

**做**：视觉结构对齐 + 接上 harmony 已具备的能力（播放全部、点击播放、喜欢、跳转专辑/MV/合集、有声书进度与续播）。

**不做**：harmony 侧缺少接口或能力的功能——批量下载、上传封面、小爱音箱投屏、有声书排序弹窗、更多操作弹窗、批量多选。这些按钮**不画占位**，避免出现点了没反应的死按钮。

**不新增后端接口**。因此 mobile 艺人页的「合作专辑」区块本次省略（详见"已知差异"）。

## 专辑详情页

### 布局

```
CommonNavBar：‹ 返回   [专辑名]   (右侧 44 占位)
滚动内容（左右 padding 20，底部 padding 40）
  Hero（居中）
    封面 200×200，圆角 10，下边距 15
      有声书且 progress > 0 时，封面底部叠 4px 白色半透明进度条，
      内层按 progress% 填 primary 色
    专辑名   fontSize 24 bold 居中，下边距 5
    艺人名   fontSize 18 textSecondary 居中
    操作行（居中，间距 10，上边距 20）
      [▶ 播放全部 / 继续播放]  胶囊按钮：primary 底，onPrimary 字，
                              paddingH 25 / paddingV 10 / radius 25，fontSize 16 w600
      (♡)                     44×44 圆形，surfaceAlt 底；
                              已喜欢时图标 primary 实心，未喜欢时 textSecondary 描边
  （mvs 非空时）tab 行：曲目(n) | MV(n)
      两个等宽 tab，底部 1px border 分隔，选中项下方 2px primary 下划线，
      选中文字 primary + bold，未选中 textSecondary
  TrackRow × N（activeTab 决定渲染曲目还是 MV）
```

### 行为

- 数据：`albumApi.getById(entityId)` 返回 `AlbumDetailResp`（含 `tracks`）。不分页、不排序——harmony 无 `getAlbumTracks` 接口，曲目随详情一次返回。
- MV：`mvApi.byAlbum(album.name, album.artist)`，失败静默忽略（`catch` 里只 log）。返回非空才渲染 tab 行；为空时不显示 tab，直接列曲目。
- 播放全部：`resolveTrackToPlayer` 逐条解析成 `Track` → `playerStore.playTrackList(list, startIndex)` → `router.pushUrl('pages/PlayerPage')`。
- 续播：`album.resumeTrackId` 存在且能在 tracks 中找到时，按钮文案用 `t('albumPage.continuePlaying')`，`startIndex` 指向该曲目，播放后 `playerStore.seek(resumeProgress * 1000)`。否则文案 `t('albumPage.playAll')`，`startIndex = 0`。
- 喜欢：沿用现有 `likesHistory.likeAlbum/unlikeAlbum` + `likesHistory.on('albumLike')` 订阅，`aboutToDisappear` 退订。
- MV 行点击：`router.pushUrl({ url: 'pages/MVDetailPage', params: { id } })`。

### 曲目行（TrackRow）

```
Row（paddingVertical 12，底部 1px border 色 theme.colors.border）
  序号槽 width 50 居中
    当前播放曲目 → primary 色的 "▶"
    其他        → 序号（index + 1），fontSize 14 textSecondary
  小封面 20×20，圆角 2
  信息区 layoutWeight 1，左右 margin 10
    曲名 fontSize 16，单行省略；
      有声书且已听过时字色 textSecondary（表示"已读"），否则 text
    来源标签 fontSize 10 textSecondary，左 margin 6：
      source === 'WEBDAV' → t('trackList.sourceWebdav')，否则 t('trackList.sourceFile')
  （有声书且已听进度 > 0）"已听 x%" fontSize 10 primary，右 margin 10
  时长 fontSize 12 textSecondary，formatDuration(duration * 1000)
```

## 艺人详情页

### 布局

去掉现有的「热门单曲 / 专辑」子 tab，改为单页纵向滚动的区块式布局。

```
CommonNavBar：‹ 返回   (标题留空)   (右侧 44 占位)
  标题留空是为了跟 mobile 一致 —— 艺人名显示在头像下方
滚动内容
  Hero（居中，padding 20）
    头像 150×150 圆形（radius 75），下边距 15
    艺人名 fontSize 24 bold 居中
  「全部专辑 (n)」          albums 非空时显示
    SectionHeader：fontSize 20 bold，左右 padding 20，下边距 15
    横向滚动 Row：AlbumCarouselCard × N
  「相关合集 (n)」          artist.type === 'AUDIOBOOK' 且过滤结果非空时显示
    横向滚动卡片，点击 → CollectionDetailPage
  「MV (n)」                mvs 非空时显示
    横向滚动卡片，点击 → MVDetailPage
  「全部曲目 (n)」          artist.type !== 'AUDIOBOOK' 时显示
    SectionHeader，右侧插入 (▶) 36×36 圆形 primary 按钮 —— 播放全部
    TrackRow × N（与专辑页同一组件）
```

### 行为

- 数据：`artistApi.getById(entityId)` 一次返回 `{ artist, albums, tracks }`，不额外请求专辑/曲目。
- MV：`mvApi.byArtist(artist.name)`，失败静默忽略。
- 相关合集：`collectionApi.list(userId)` → 过滤出「`items` 中存在某个 `item.album.id` 属于该艺人专辑 id 集合」的合集。逻辑照搬 mobile。`userId` 取自 `authStore.state_.user`（`user` 为 null 时该区块不显示），与 `LibraryPage.ets` 现有取法一致。
- 有声书判断用 `artist.type === 'AUDIOBOOK'`，而非 mobile 的全局音乐/有声书模式开关（harmony 的 mode 是各 tab 页的局部 `@State`，详情页拿不到）。
- 专辑卡片点击 → `router.pushUrl({ url: 'pages/AlbumDetailPage', params: { id } })`（现有行为，保留）。

## 新增组件

均放在 `apps/harmony/products/entry/src/main/ets/components/`，`@Component` + `@Prop`，遵循项目 ArkTS 规范（不用 `any`、不用解构、显式返回类型、import 置顶）。

| 组件 | props |
|---|---|
| `DetailHero.ets` | `coverPath: string \| null`、`size: number`、`circle: boolean`、`title: string`、`subtitle: string`、`progress: number`（0–100，0 表示不画）、`theme: Theme` |
| `SectionHeader.ets` | `title: string`、`theme: Theme`，右侧操作用 `@BuilderParam action` 插入 |
| `AlbumCarouselCard.ets` | `coverPath: string \| null`、`name: string`、`progress: number`、`theme: Theme`、`onCardClick: () => void` |
| `TrackRow.ets` | `index: number`、`name: string`、`source: string`、`duration: number`、`coverPath: string \| null`、`isCurrent: boolean`、`listenedPercent: number`、`theme: Theme`、`onRowClick: () => void` |

封面统一走现有 `CoverImage`（内部用 `utils/image.ets` 的 `getImageUrl` 拼 base URL，并有首字母兜底）。

组件放在 entry 而非 `features_ui` HAR：`features_ui` 只依赖 `audiodock_common`，而封面 URL 依赖 `httpClient.getBaseURL()`（在 `features_network`），放进 HAR 会引入新的模块依赖，收益不抵成本。

## 当前播放高亮

两个页面都新增：

```ts
@State currentTrackId: string = '';
private unsubPlayer: () => void = () => {};

aboutToAppear(): void {
  this.unsubPlayer = playerStore.subscribe(() => {
    const v = playerStore.view();
    const cur = v.queue[v.currentIndex];
    this.currentTrackId = cur ? cur.id : '';
  });
}
aboutToDisappear(): void {
  this.unsubPlayer();
}
```

`TrackRow.isCurrent = track.id === this.currentTrackId`。

mobile 的 `PlayingIndicator` 是动画组件，harmony 无对应实现；用 primary 色的 "▶" 字符代替，位置与序号相同。

## 加载态与错误态

沿用现有 `SkeletonBlock` / `EmptyView` + `CommonButton` 重试的结构，但骨架形状改成与新布局对应：

- 专辑页：200×200 方块 + 180×28 标题条 + 120×20 副标题条 + 操作行（150×44 胶囊 + 44 圆）+ 8 行曲目占位。
- 艺人页：150×150 圆 + 170×28 名称条 + 一个区块标题条 + 3 张 120×120 卡片占位 + 区块标题行 + 7 行曲目占位。

错误态维持现状：`EmptyView(message)` + 重试按钮调 `load()`。

## 文案

### 前置修复：`t()` 不认 `{{count}}` 占位符

locale 文件是从 mobile 的 i18next 资源同步过来的，占位符写法是 `{{count}}`，但 `features/i18n/src/main/ets/I18n.ets` 的 `t()` 只替换单层大括号：

```ts
raw.replace(/\{(\w+)\}/g, ...)
```

结果 `t('artistPage.allAlbums', { count: 5 })` 会渲染成 `所有专辑 ({5})` —— 多出一层括号。

目前 harmony 没有任何页面用带参数的 `t()`（已 grep 确认），所以这条路径从未被触发；本次两个页面是第一次用到。

实施时先把正则改成同时兼容单双层大括号：

```ts
raw.replace(/\{\{?(\w+)\}\}?/g, ...)
```

保持 locale 文件与 mobile 同步不变（它们是同一份资源的副本，不应为了迁就 harmony 而分叉）。

### 用到的 key

`albumPage.*` 与 `artistPage.*` 两个命名空间在 `features/i18n` 的 zh-CN 与 en 中**已存在**，本次直接使用，无需新增：

- 专辑页：`albumPage.playAll`（"播放全部"）、`albumPage.continuePlaying`（"继续播放"）
- 艺人页：`artistPage.allAlbums`（"所有专辑 ({{count}})"）、`artistPage.relatedCollections`、`artistPage.allTracks`
- 曲目来源：`trackList.sourceWebdav`（"WebDAV"）、`trackList.sourceFile`（"文件"）
- 已听百分比：`playerPage.listened`（"已听"）
- 专辑页曲目 tab 标题：`nav.tracks`（"单曲"）
- MV 区块标题为字面量 `MV (n)`，与 mobile 一致

以上 key 均已逐个核对存在于 zh-CN.ts。

## 图标

需要 ▶（播放）与 ♡（喜欢）。`AppIcon` 目前只有一份"编译验证过"的白名单，`heart` 在内，`play` 不在。

实施时给 `AppIcon` 增加 `'play' -> $r('sys.symbol.play_fill')` 并编译验证。若该符号名在 API 22 下不可用（表现为 10903329 编译错误），退回用文字字符 `▶`——`MiniPlayer.ets` 现在就是这么做的。

## 主题

页面颜色全部走 `theme.colors.*`，不用 mobile 的硬编码色值。mobile 的 `colors.card` 对应 harmony 的 `surfaceAlt`，`colors.secondary` 对应 `textSecondary`。

## 已知差异（本次不做，留作后续）

1. **艺人页「合作专辑」区块缺失** —— 需要在 `features_network` 新增 `getCollaborativeAlbumsByArtist`（后端 `GET /album/collaborative/{artist}` 已存在）。
2. 右上角「更多」操作弹窗（上传封面 / 添加到歌单 / 合集管理）。
3. 批量多选 + 批量下载 / 批量加入歌单。
4. 小爱音箱投屏。
5. 有声书曲目排序弹窗（依赖 `getAlbumTracks` 分页排序接口）。
6. 曲目列表分页加载与「定位当前播放」悬浮按钮。

## 验证

每完成一步执行：

```bash
cd apps/harmony
DEVECO_SDK_HOME=/Applications/DevEco-Studio.app/Contents/sdk \
  /Applications/DevEco-Studio.app/Contents/tools/node/bin/node \
  /Applications/DevEco-Studio.app/Contents/tools/hvigor/bin/hvigorw.js \
  assembleHap --no-daemon
```

通过标准：输出 `BUILD SUCCESSFUL`，且不新增 ArkTS ERROR（已有的 deprecated 类 WARN 可以保留）。

基线已确认：改动前该命令构建成功。
