# AudioDock HarmonyOS 应用架构规划

## 目标
根据 mobile 子项目，1:1 实现鸿蒙版本 App 所有页面和功能。

## 已完成功能
- [x] 基础框架搭建 + SDK 适配
- [x] 数据源选择页面 (SourceSelectPage)
- [x] 数据源登录页面 (LoginPage) + 真实 API
- [x] 首页 (HomePage) + 真实 API + 喜欢/刷新/模式切换
- [x] HTTP 客户端 + 存储层 + API 服务层
- [x] 底部 Tab 导航框架 (MainPage) - 首页/音乐库/个人中心
- [x] 音乐库页面 (LibraryPage) - MUSIC/AUDIOBOOK 模式切换, 5种Tab
- [x] 个人中心页面 (PersonalPage) - 播放列表/收藏/历史
- [x] 专辑详情页 (AlbumDetailPage) - 封面, 曲目列表, 排序, 喜欢
- [x] 艺人详情页 (ArtistDetailPage) - 单曲/专辑 Tab
- [x] 搜索页面 (SearchPage) - 关键词搜索, 分类筛选
- [x] 设置页面 (SettingsPage) - 服务器信息, 切换数据源, 退出登录
- [x] 数据源管理 (SourceManagePage) - 列表, 切换, 添加
- [x] 播放器页面 (PlayerPage) - 播放控制 UI 框架

## 待实现功能

### 页面间跳转
- [ ] HomePage → AlbumDetailPage (推荐专辑点击)
- [ ] HomePage → ArtistDetailPage (最新艺人点击)
- [ ] HomePage → SearchPage (搜索按钮)
- [ ] LibraryPage → AlbumDetailPage (专辑列表点击)
- [ ] LibraryPage → ArtistDetailPage (艺人列表点击)
- [ ] LibraryPage → PlayerPage (曲目播放)
- [ ] PersonalPage → SettingsPage (设置入口)
- [ ] PersonalPage → SourceManagePage (数据源管理)
- [ ] PersonalPage → PlayerPage (播放列表中的曲目)
- [ ] AlbumDetailPage → PlayerPage (播放全部/点击曲目)
- [ ] ArtistDetailPage → PlayerPage (点击曲目)
- [ ] SearchPage → AlbumDetailPage/ArtistDetailPage/PlayerPage (结果点击)

### 核心功能待完善
- [ ] 实际音频播放 (集成 HarmonyOS AVPlayer)
- [ ] 图片加载 (从服务器 URL 加载封面)
- [ ] 歌词显示
- [ ] 播放列表管理
- [ ] 下载管理

### Phase 4: 会员 + 其他页面
- [ ] MemberLoginPage - 会员登录
- [ ] MemberDetailPage - 会员详情
- [ ] ScanLoginPage - 扫码登录
- [ ] PlaylistDetailPage - 播放列表详情
- [ ] CollectionDetailPage - 收藏详情
- [ ] AdminPage - 管理后台入口
- [ ] LanguagePage - 语言切换

## 技术约束
- ArkTS 严格模式 (no any, no spread, explicit types)
- @ohos.net.http 网络请求
- @ohos.data.preferences 本地存储
- 图标不一致时可替换
- 仅本地 commit, 不 push

## 文件结构
```
products/entry/src/main/ets/
  ├── pages/
  │   ├── MainPage.ets          ✅ 主框架(Tab导航)
  │   ├── HomePage.ets          ✅ 首页
  │   ├── LibraryPage.ets       ✅ 音乐库
  │   ├── PersonalPage.ets      ✅ 个人中心
  │   ├── AlbumDetailPage.ets   ✅ 专辑详情
  │   ├── ArtistDetailPage.ets  ✅ 艺人详情
  │   ├── PlayerPage.ets        ✅ 播放器(框架)
  │   ├── SearchPage.ets        ✅ 搜索
  │   ├── SettingsPage.ets      ✅ 设置
  │   ├── SourceManagePage.ets  ✅ 数据源管理
  │   ├── LoginPage.ets         ✅ 登录
  │   ├── SourceSelectPage.ets  ✅ 数据源选择
  │   └── Index.ets             ✅ 入口跳转
  ├── utils/
  │   ├── HttpClient.ets         ✅ HTTP
  │   ├── StorageManager.ets     ✅ 存储
  │   └── ApiService.ets         ✅ API
  └── components/
      ├── MiniPlayer.ets         ⏳ 底部迷你播放器
      └── CachedImage.ets        ⏳ 图片加载组件
```

## Git Commit 历史
```
46e1f89 feat(harmony): 基础框架
98b8c46 feat(harmony): 实现网络请求层
90c03da feat(harmony): 新增首页
92a1332 feat(harmony): Task1 - 底部 Tab 导航框架 (MainPage)
99aa4b3 feat(harmony): Task2 - 音乐库页面 (LibraryPage)
0fb7eb2 feat(harmony): Task3 - 个人中心页面 (PersonalPage)
c8e8d82 feat(harmony): Task4-8 - 核心页面集合
00a4652 feat(harmony): Task9 - 播放器页面 (PlayerPage)
```
