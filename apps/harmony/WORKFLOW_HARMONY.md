# AudioDock HarmonyOS 开发工作流

## 开发模式
- 轮询周期: 每 3 分钟检查一次任务状态
- 分配方式: 串行执行，每轮检查未完成任务并分配给开发 agent
- 提交方式: 每个任务完成后本地 commit

## 任务清单

### Task 1: 底部 Tab 导航框架 (MainPage)
**状态**: pending  
**文件**: `pages/MainPage.ets`  
**参考**: mobile `app/(tabs)/_layout.tsx`  
**说明**: 创建底部 Tab 导航框架，包含首页、音乐库、个人中心三个 Tab。删除旧的 Index.ets HelloWorld 页面，改为入口直接跳转到 MainPage。  
**依赖**: 无

### Task 2: 音乐库页面 (LibraryPage)
**状态**: pending  
**文件**: `pages/LibraryPage.ets`  
**参考**: mobile `app/(tabs)/library.tsx`  
**说明**: 实现音乐库页面，包含全部专辑、全部艺人、全部曲目、最近播放等分类入口。  
**依赖**: Task 1

### Task 3: 个人中心页面 (PersonalPage)
**状态**: pending  
**文件**: `pages/PersonalPage.ets`  
**参考**: mobile `app/(tabs)/personal.tsx`  
**说明**: 实现个人中心页面，包含用户信息、设置入口、数据源切换、会员入口、清除缓存等。  
**依赖**: Task 1

### Task 4: 专辑详情页 (AlbumDetailPage)
**状态**: pending  
**文件**: `pages/AlbumDetailPage.ets`  
**参考**: mobile `app/album/[id].tsx`  
**说明**: 实现专辑详情页，包含专辑封面、专辑信息、曲目列表、播放全部、添加到队列等。支持从首页跳转传入 albumId。  
**依赖**: Task 1, Task 2

### Task 5: 艺人详情页 (ArtistDetailPage)
**状态**: pending  
**文件**: `pages/ArtistDetailPage.ets`  
**参考**: mobile `app/artist/[id].tsx`  
**说明**: 实现艺人详情页，包含艺人头像、艺人信息、专辑列表、热门曲目。  
**依赖**: Task 1

### Task 6: 播放器页面 (PlayerPage)
**状态**: pending  
**文件**: `pages/PlayerPage.ets`  
**参考**: mobile `app/player.tsx`  
**说明**: 实现播放器页面，包含封面大图、播放/暂停、上一首/下一首、进度条、播放模式、喜欢按钮、歌词显示等。  
**依赖**: Task 4

### Task 7: 搜索页面 (SearchPage)
**状态**: pending  
**文件**: `pages/SearchPage.ets`  
**参考**: mobile `app/search.tsx`  
**说明**: 实现搜索页面，包含搜索框、搜索历史、搜索结果分类（专辑/艺人/曲目）。  
**依赖**: Task 1

### Task 8: 设置页面 (SettingsPage)
**状态**: pending  
**文件**: `pages/SettingsPage.ets`  
**参考**: mobile `app/settings.tsx`  
**说明**: 实现设置页面，包含主题切换、播放设置、清除缓存、关于我们等。  
**依赖**: Task 3

### Task 9: 数据源管理页面 (SourceManagePage)
**状态**: pending  
**文件**: `pages/SourceManagePage.ets`  
**参考**: mobile `app/source-manage.tsx`  
**说明**: 实现数据源管理页面，显示已保存的数据源列表，支持切换、编辑、删除数据源。  
**依赖**: Task 3

### Task 10: 会员相关页面
**状态**: pending  
**文件**: `pages/Member*.ets`  
**参考**: mobile `app/member-*.tsx`  
**说明**: 实现会员登录、会员详情、会员权益、支付成功等页面。  
**依赖**: Task 3

## ArkTS 开发规范
1. 使用 `Record<string, Object>` 替代 `any`
2. 不使用 `URLSearchParams`，手动构建查询字符串
3. 不使用解构赋值
4. catch 块不使用 `catch (error: any)`
5. 对象字面量必须对应显式声明的类或接口
6. 所有 import 放在文件顶部
7. 函数使用显式返回类型

## 开发 Agent 指令模板
```
你是专业鸿蒙 ArkTS 开发工程师。请根据 mobile 子项目代码，实现指定的 HarmonyOS 页面。

要求：
1. 页面路径: ~/documents/projects/AudioDock/apps/harmony/products/entry/src/main/ets/pages/{PAGE_NAME}.ets
2. 参考 mobile 代码: ~/documents/projects/AudioDock/apps/mobile/app/{REFERENCE_PATH}
3. 复用已有工具类: HttpClient.ets, StorageManager.ets, ApiService.ets
4. 遵循 ArkTS 严格模式，不使用 any/unknown
5. 页面功能与 mobile 保持一致，布局尽可能一致
6. 不一致的图标可以替换
7. 完成后更新 main_pages.json 添加页面路由
8. 编译通过后本地 git commit

mobile 项目使用 React Native + Expo，鸿蒙使用 ArkTS + ArkUI。
需要将 React Native 的 JSX 转换为 ArkTS 的声明式 UI。
```
