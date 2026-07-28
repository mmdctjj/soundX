# 版本发布流程：Beta 与 Stable 分离设计

**日期**：2026-07-29
**状态**：已设计，待用户复审
**作者**：Claude (brainstorming 流程产出)

## 背景与目标

当前 `scripts/release.js` 把所有发布动作混在一起，只支持 `patch/minor/major` 三种粒度，没有"测试版"概念。现状痛点：

- 预发版（内测 / QA 用）和正式版无法在版本号上区分
- 一次发布粒度过粗，无法先发小版本给内测用户验证、再发正式版
- 没有 pre-release 阶段，hotfix 流程不清晰

**目标**：让 monorepo 拥有 `pnpm release:beta`（测试版）和 `pnpm release`（正式版）两套独立入口，自动维护 semver 兼容的版本号推算，并保留现有的 desktop web 构建前置校验。

## 命令与版本映射（核心算法）

### Beta 模式

| 当前根版本 | 下一个版本 |
|---|---|
| `1.2.22`（stable） | `1.2.23-beta.1` |
| `1.2.23-beta.1` | `1.2.23-beta.2` |
| `1.2.23-beta.9` | `1.2.23-beta.10` |
| `1.2.23-rc.1`（历史遗留） | `1.2.24-beta.1` |

实现：解析当前 `version` → 若以 `-<preid>.<n>` 结尾，`inc('prerelease', 'beta')`；否则 `inc('patch')` 后追加 `-beta.1`。

### Stable 模式（智能 fallback）

| 当前根版本 | 下一个版本 |
|---|---|
| `1.2.22`（稳定版直接 release） | `1.2.23` |
| `1.2.23-beta.2` | `1.2.23`（剥离 preid） |
| `1.2.23-rc.1`（历史遗留） | `1.2.23`（剥离） |

实现：解析当前 `version` → 若有 preid，剥掉；否则 `inc('patch')`。

### 关键约束

- preid 写死为 `beta`，要换 rc/alpha 必须改代码（先 YAGNI）
- 根 `package.json` 是 source of truth，其他包以根为准同步
- 所有非数字 preid 不允许（如 `1.2.23-beta1` 会被拒）

## 命令行接口

```bash
# Beta 模式
pnpm release:beta              # 交互式菜单
pnpm release:beta patch        # 显式从 stable 推到下一个 beta 起点
pnpm release:beta next         # 显式递增当前 beta
pnpm release:beta 1.2.24-beta.1 # 指定具体版本号

# Stable 模式（保留原行为 + 智能 fallback）
pnpm release                   # 智能 fallback
pnpm release patch             # 原行为
pnpm release minor             # 原行为
pnpm release 1.2.30            # 原行为
```

**交互模式（`pnpm release:beta` 无参）**：列出当前版本 + 三个选项：
1. `Next beta (1.2.23-beta.2)` —— 走自动递增
2. `New patch beta (1.2.23-beta.1)` —— 从 stable 重置
3. `Custom version` —— 手动输入

**`pnpm release` 无参**：保留现有 patch/minor/major/custom 四选项菜单，不新增 beta 选项（避免和 `release:beta` 混用）。

## Git Tag 与 Commit 格式

**Tag 命名**：
- Beta：`v1.2.23-beta.1`、`v1.2.23-beta.2` ...
- Stable：`v1.2.23`

**Commit message**：

| 模式 / 子参数 | 格式 |
|---|---|
| Beta（自动递增） | `chore(release): bump to 1.2.23-beta.2` |
| Beta（显式 patch） | `chore(release): start 1.2.23-beta.1 cycle` |
| Beta（自定义） | `chore(release): bump to <version>` |
| Stable | `chore(release): release 1.2.23` |

**Push 行为**：脚本不自动 push，打印提示让用户自己 `git push && git push --tags`。Beta 模式额外打印 `ℹ️ This is a BETA. Only push tags you intend to share.`

## 副作用流程

| 步骤 | 行为 | 模式 |
|---|---|---|
| 预检 | version 合法 / 参数合法 / 工作区干净 / tag 不存在 / pnpm 可用 | 两者 |
| **0. 前置预检** | `pnpm --filter sound-x run build:web` | 两者 |
| 1. 同步更新所有 `PACKAGES` 内的 `version` | 步骤 0 通过后执行 | 两者 |
| 2. `npx expo prebuild`（mobile） | | 两者 |
| 3. `git add .` | | 两者 |
| 4. `git commit -m ...` | 按上表区分动词 | 两者 |
| 5. `git tag v<version>` | | 两者 |

**为什么 beta 也跑 `expo prebuild`**：mobile app.json 改了 version 必须重新生成原生项目（iOS bundleIdentifier 版本、Android versionCode 等），否则下次跑稳定 release 时 prebuild 会基于旧 version 触发冲突。两次都跑保证 native 项目始终与 version 同步。

**为什么 desktop build:web 在最前面**：用户的核心诉求是"build 报错就停止修改版本号"，只有放在 version 同步**之前**才真正能"压根不做"。同时 desktop web 构建是耗时最长的本地步骤之一，越早失败越省时间。

**dry-run 模式**：环境变量 `RELEASE_DRY_RUN=1` 时只打印将执行的命令，不实际写文件 / commit / tag。便于本地试跑 beta 号。

## 错误处理与回滚策略

### 回滚策略

| 步骤 | 失败时回滚动作 |
|---|---|
| 步骤 1（package.json 写入） | 把每个 `package.json` 还原到**原始字节**（步骤 0 通过后、写入前预先在内存里缓存原内容） |
| 步骤 2（`expo prebuild`） | 先还原所有 `package.json`；`expo prebuild` 产物（`apps/mobile/ios`、`apps/mobile/android`）无法精确回滚，**只打印中文提示**让用户检查或手动 `git checkout -- apps/mobile` |
| 步骤 3（git add / commit / tag） | 脚本**不**自动 `git reset` / `git tag -d`（破坏性大），只打印中文提示和具体修复命令让用户执行 |

**为什么不完全自动回滚步骤 3**：用户可能希望保留已 commit 的内容用于补救；脚本自作主张执行 `git reset --hard` 风险太高。

### 失败信息规范（全部中文）

| 失败点 | 中文提示 |
|---|---|
| 步骤 0（build:web） | `❌ desktop build:web 失败，未修改任何版本号。错误详情：<原始 stderr>` |
| 步骤 1（package.json 写入） | `❌ 更新 <文件路径> 失败：<原因>。已回滚所有 package.json 到原版本。` |
| 步骤 2（expo prebuild） | `❌ expo prebuild 失败：<原因>。已回滚 package.json。请检查 apps/mobile/ios 和 apps/mobile/android 是否需要手动清理。` |
| 步骤 3（git 操作） | `❌ git <子命令> 失败：<原因>。手动修复：git reset HEAD~1 && git tag -d v<版本号>` |
| 预检：版本号非法 | `❌ 版本号格式不合法：<version>` |
| 预检：工作区脏 | `❌ 工作区有未提交的修改，请先 commit 或 stash 后再发布。` |
| 预检：tag 已存在 | `❌ 标签 v<版本号> 已存在，请更换版本号后重试。` |
| 预检：参数非法 | `❌ 未知的发布模式：<arg>。可用模式：beta（运行 release:beta）或留空（运行 release）。` |
| 预检：pnpm 缺失 | `❌ 未检测到 pnpm，请先安装 pnpm@<packageManager 里的版本>。` |

所有失败统一退出码 1，错误信息打 stderr（不是 stdout）。

## 步骤流程（最终）

```
[预检] version 合法 / 参数合法 / 工作区干净 / tag 不存在 / pnpm 可用
   ↓
[步骤 0] pnpm --filter sound-x run build:web
   ↓ 通过
[步骤 1] 缓存原内容 → 同步更新 9 个 package.json 的 version
   ↓ 通过
[步骤 2] npx expo prebuild
   ↓ 通过
[步骤 3] git add . → git commit → git tag
   ↓
打印 push 提示
```

## 测试计划

### 单元测试（`node:test` + `assert`，零依赖）

| 函数 | 测试用例 |
|---|---|
| `computeNextVersion(currentVersion, mode, subArg)` | stable→stable、stable→beta、beta→beta、beta→stable、beta.9→beta.10、非法输入 |
| `computeCommitMessage(mode, subArg, version)` | 各模式/子参数的预期 message |
| `checkExistingTag(version)` | 已存在返回 true、否则 false（用临时 git 仓库验证） |
| `checkWorkingTreeDirty()` | 干净 / 有 untracked / 有 modified 三种 |
| `rollbackPackageJson(originalContents)` | 回滚后内容字节级一致 |

### 集成测试（手动 + 脚本化）

| 场景 | 预期 |
|---|---|
| `release:beta patch`（从 `1.2.22` 开始） | 9 个文件 version → `1.2.23-beta.1`，tag `v1.2.23-beta.1` |
| `release:beta next`（从 `1.2.23-beta.1` 开始） | → `1.2.23-beta.2` |
| `release`（从 `1.2.23-beta.2` 开始） | → `1.2.23`，tag `v1.2.23` |
| `release patch`（从 `1.2.22` 开始） | → `1.2.23`（原行为不变） |
| 工作区脏时跑任何命令 | 立即退出，无文件改动 |
| 已存在 `v1.2.23-beta.1` 时再跑 | 退出，无文件改动 |
| `RELEASE_DRY_RUN=1` 跑全流程 | 所有副作用（写文件、prebuild、commit、tag）都被跳过 |

### 不测的部分

- `expo prebuild` / `git` / `pnpm` 自身的行为 —— 假设这些工具可靠
- 交互式 readline —— 太难脚本化，靠手动验证

## 改动范围

| 文件 | 改动 |
|---|---|
| `scripts/release.js` | 重写：增加模式分发 + semver 算法 + 预检 + 步骤 0 + 回滚 + 中文提示 |
| `package.json` | `scripts.release:beta` 新增；`scripts.release` 保持不变 |
| `scripts/release.test.js`（新文件） | 单元测试 |

不在改动范围内：CI 流水线、changelog 自动生成、其他发布工具集成。

## 实施后预期效果

用户场景示例（从 `1.2.22` 出发）：

```bash
pnpm release:beta
# → 跑 build:web（前置校验）
# → 9 个 package.json 同步到 1.2.23-beta.1
# → expo prebuild
# → commit + tag v1.2.23-beta.1
# 用户手动 git push

pnpm release:beta   # 第二次跑
# → 自动递增到 1.2.23-beta.2

pnpm release
# → 智能 fallback，剥离 preid → 1.2.23
# → 跑 build:web + expo prebuild + commit + tag v1.2.23
```

## 待确认事项

无 —— 用户已在 brainstorming 流程中确认所有关键决策。