# AudioDock HarmonyOS 应用架构规划

## 目标
根据 mobile 子项目，1:1 实现鸿蒙版本 App 所有页面和功能。

## 已完成功能
- [x] 基础框架搭建 + SDK 适配
- [x] 数据源选择页面 (SourceSelectPage)
- [x] 数据源登录页面 (LoginPage) + 真实 API
- [x] 首页 (HomePage) + 真实 API + 喜欢/刷新/模式切换
- [x] HTTP 客户端 + 存储层 + API 服务层

## 待实现页面清单（按优先级）

### Phase 1: 核心框架 + 底部导航
1. **MainPage** - 主框架，底部 Tab 导航（首页/音乐库/我的）
2. **LibraryPage** - 音乐库页面（参考 mobile app/(tabs)/library.tsx）
3. **PersonalPage** - 个人中心页面（参考 mobile app/(tabs)/personal.tsx）
4. 删除 HelloWorld 的 Index 页面，改为入口跳转

### Phase 2: 内容详情页
5. **AlbumDetailPage** - 专辑详情页（曲目列表、播放全部）
6. **ArtistDetailPage** - 艺人详情页（专辑列表、曲目列表）
7. **PlayerPage** - 播放器页面（播放控制、进度条、歌词）

### Phase 3: 功能页面
8. **SearchPage** - 搜索页面（搜索框、搜索结果分类）
9. **SettingsPage** - 设置页面（主题、语言、清除缓存等）
10. **SourceManagePage** - 数据源管理（多数据源切换、添加/删除）

### Phase 4: 会员 + 其他
11. **MemberLoginPage** - 会员登录
12. **MemberDetailPage** - 会员详情
13. **ScanLoginPage** - 扫码登录
14. **PlaylistDetailPage** - 播放列表详情
15. **CollectionDetailPage** - 收藏详情
16. **FolderPage** - 文件夹浏览
17. **AdminPage** - 管理后台入口
18. **PlaybackQualityPage** - 播放音质设置
19. **LanguagePage** - 语言切换
20. **TTSPage** - TTS 相关页面

## 技术约束
- ArkTS 严格模式（no any, no spread, explicit types）
- @ohos.net.http 网络请求
- @ohos.data.preferences 本地存储
- 图标不一致时可替换
- 仅本地 commit，不 push

## 文件结构
```
products/entry/src/main/ets/
  ├── pages/                    # 页面
  │   ├── MainPage.ets         # 主框架(Tab导航)
│   ├── HomePage.ets           # 首页
  │   ├── LibraryPage.ets      # 音乐库
  │   ├── PersonalPage.ets     # 个人中心
  │   ├── AlbumDetailPage.ets  # 专辑详情
  │   ├── ArtistDetailPage.ets # 艺人详情
  │   ├── PlayerPage.ets       # 播放器
  │   ├── SearchPage.ets       # 搜索
  │   ├── SettingsPage.ets     # 设置
  │   ├── SourceManagePage.ets # 数据源管理
  │   ├── LoginPage.ets        # 登录(已完成)
│   └── SourceSelectPage.ets   # 数据源选择(已完成)
  ├── utils/
│   ├── HttpClient.ets         # HTTP(已完成)
  │   ├── StorageManager.ets   # 存储(已完成)
│   └── ApiService.ets         # API(已完成)
  └── components/              # 公共组件
      ├── MiniPlayer.ets       # 底部迷你播放器
      └── CachedImage.ets      # 图片加载组件
```
