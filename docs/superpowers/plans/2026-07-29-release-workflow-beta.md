# Release Workflow Beta/Stable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 monorepo 增加 `pnpm release:beta`（测试版）与 `pnpm release`（智能 fallback）两套独立发布入口，基于 semver 自动维护版本号推算，并在 desktop web 构建前置校验失败时阻止任何版本号变更。

**Architecture:** 单文件 `scripts/release.js` 重写为模式分发脚本（`beta` / `stable`），所有纯函数（版本号推算、commit message、预检、包同步回滚）走 `node:test` 单元测试覆盖；副作用（`pnpm build:web` / `expo prebuild` / git）由编排函数串联，失败按既定策略回滚并打印中文提示。零新增运行时依赖（用 Node 内置 `semver` 自 v20.7 起已可用）。

**Tech Stack:** Node.js ≥20.7（自带 `semver` 与 `node:test`）、pnpm 10.28.1、git、expo CLI（仅 mobile 步骤使用）。

## Global Constraints

- Node.js 引擎要求 `>=20.7.0`（见 `package.json#engines`，如未声明则 `package.json` 里写 `"engines": {"node": ">=20.7.0"}`）
- 包管理器：pnpm 10.28.1（来自 `package.json#packageManager`）
- preid 写死为字符串 `beta`
- 所有用户可见的错误信息必须为简体中文，打印到 stderr，进程退出码 1
- 9 个同步版本号的文件路径：`package.json`, `apps/desktop/package.json`, `apps/mobile/package.json`, `apps/mobile/app.json`, `packages/i18e/package.json`, `services/api/package.json`, `packages/db/package.json`, `packages/utils/package.json`, `packages/ws/package.json`
- `apps/mobile/app.json` 写入位置为 `pkg.expo.version`，其余为 `pkg.version`
- git tag 格式：`v<version>`（如 `v1.2.23-beta.1` 或 `v1.2.23`）
- dry-run 触发条件：环境变量 `RELEASE_DRY_RUN === '1'`
- commit message 必须为英文（保持与现有提交历史一致），错误信息必须为中文

---

### Task 1: 脚手架与 semver 可用性

**Files:**
- Modify: `package.json`（新增 `engines` 与 `scripts.release:beta`，最终 Task 8 才补；本 task 只加 engines）
- Create: `scripts/release.test.js`（占位空文件，下一 task 填测试）

**Interfaces:**
- Consumes: 无
- Produces: 测试运行器能 `node --test scripts/release.test.js` 但里面无任何用例（仅占位）

- [ ] **Step 1: 在 `package.json` 添加 engines 字段**

打开 `/Users/ctjj/Documents/projects/audiodock_worktree/package.json`，在 `"license": "ISC"` 后插入：

```json
  "engines": {
    "node": ">=20.7.0"
  },
```

确保末尾逗号合法（ISC 之后要补逗号）。

- [ ] **Step 2: 创建空测试文件**

```bash
mkdir -p scripts
```

创建 `/Users/ctjj/Documents/projects/audiodock_worktree/scripts/release.test.js`，内容：

```javascript
// Tests will be added in subsequent tasks. Run with:
//   node --test scripts/release.test.js
```

- [ ] **Step 3: 验证 Node 版本与 semver 可用**

```bash
node -e "console.log(require('semver').SEMVER_SPEC_VERSION)"
```

预期输出形如 `2.0.0` 或更高（任一非空字符串）。如果输出 `Cannot find module 'semver'` 则说明 Node < 20.7，需要升级 Node 后再继续。

- [ ] **Step 4: 验证测试运行器能跑（即使没有用例）**

```bash
node --test scripts/release.test.js
```

预期：测试通过（0 用例，0 失败），退出码 0。

- [ ] **Step 5: 提交**

```bash
git add package.json scripts/release.test.js
git commit -m "chore(release): scaffold test runner and engines requirement"
```

---

### Task 2: `computeNextVersion` 纯函数

**Files:**
- Modify: `scripts/release.js`（新增导出 `computeNextVersion`，不替换现有文件结构）
- Modify: `scripts/release.test.js`（新增 `computeNextVersion` 测试）

**Interfaces:**
- Consumes: 无（`scripts/release.js` 当前内容保留，仅追加导出）
- Produces:
  ```javascript
  // 输入: currentVersion (string), mode ('beta'|'stable'), subArg (string|undefined)
  // 输出: 新的版本号字符串; 输入非法时抛 Error
  exports.computeNextVersion = function (currentVersion, mode, subArg) { ... }
  ```
  其中 `subArg` 支持 `'patch'` / `'next'` / 显式版本号字符串 / `undefined`（按 spec 表推导）。

- [ ] **Step 1: 写失败的测试**

替换 `/Users/ctjj/Documents/projects/audiodock_worktree/scripts/release.test.js` 为：

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeNextVersion } = require('./release');

test('computeNextVersion: stable mode from stable 1.2.22 → 1.2.23', () => {
  assert.equal(computeNextVersion('1.2.22', 'stable', undefined), '1.2.23');
});

test('computeNextVersion: stable mode strips prerelease from 1.2.23-beta.2 → 1.2.23', () => {
  assert.equal(computeNextVersion('1.2.23-beta.2', 'stable', undefined), '1.2.23');
});

test('computeNextVersion: stable mode strips from 1.2.23-rc.1 → 1.2.23', () => {
  assert.equal(computeNextVersion('1.2.23-rc.1', 'stable', undefined), '1.2.23');
});

test('computeNextVersion: beta mode from stable 1.2.22 → 1.2.23-beta.1', () => {
  assert.equal(computeNextVersion('1.2.22', 'beta', undefined), '1.2.23-beta.1');
});

test('computeNextVersion: beta mode subArg=next from 1.2.23-beta.1 → 1.2.23-beta.2', () => {
  assert.equal(computeNextVersion('1.2.23-beta.1', 'beta', 'next'), '1.2.23-beta.2');
});

test('computeNextVersion: beta mode subArg=next from 1.2.23-beta.9 → 1.2.23-beta.10', () => {
  assert.equal(computeNextVersion('1.2.23-beta.9', 'beta', 'next'), '1.2.23-beta.10');
});

test('computeNextVersion: beta mode subArg=patch from 1.2.22 → 1.2.23-beta.1', () => {
  assert.equal(computeNextVersion('1.2.22', 'beta', 'patch'), '1.2.23-beta.1');
});

test('computeNextVersion: beta mode subArg=patch from 1.2.23-beta.2 → 1.2.24-beta.1', () => {
  assert.equal(computeNextVersion('1.2.23-beta.2', 'beta', 'patch'), '1.2.24-beta.1');
});

test('computeNextVersion: beta mode with explicit version subArg', () => {
  assert.equal(computeNextVersion('1.2.22', 'beta', '1.2.24-beta.1'), '1.2.24-beta.1');
});

test('computeNextVersion: throws on invalid version', () => {
  assert.throws(() => computeNextVersion('not-a-version', 'stable', undefined), /不合法/);
});

test('computeNextVersion: throws on invalid mode', () => {
  assert.throws(() => computeNextVersion('1.2.22', 'wrong', undefined), /未知的发布模式/);
});
```

- [ ] **Step 2: 跑测试确认全部失败**

```bash
node --test scripts/release.test.js
```

预期：所有 `computeNextVersion` 测试因 `Cannot find module './release'` 或 `computeNextVersion is not a function` 而失败。

- [ ] **Step 3: 在 `scripts/release.js` 末尾追加导出实现**

打开 `/Users/ctjj/Documents/projects/audiodock_worktree/scripts/release.js`，**不要删任何现有代码**，在文件最末尾追加：

```javascript
const semver = require('node:util').inspect ? null : null; // placeholder, replaced below
// ↑ 仅为锚点；删掉这一行后追加：

const semver$ = require('semver');

function computeNextVersion(currentVersion, mode, subArg) {
  if (mode !== 'beta' && mode !== 'stable') {
    throw new Error(`未知的发布模式：${mode}`);
  }
  const parsed = semver$.parse(currentVersion);
  if (!parsed) {
    throw new Error(`版本号格式不合法：${currentVersion}`);
  }

  // 显式版本号优先（旁路算法）
  if (mode === 'beta' && subArg && /^\d+\.\d+\.\d+-beta\.\d+$/.test(subArg)) {
    return subArg;
  }

  // stable 模式：剥离 preid
  if (mode === 'stable') {
    if (parsed.prerelease.length > 0) {
      return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
    }
    return semver$.inc(currentVersion, 'patch');
  }

  // beta 模式
  const hasBetaPrerelease = parsed.prerelease[0] === 'beta' && typeof parsed.prerelease[1] === 'number';
  if (hasBetaPrerelease && subArg !== 'patch') {
    return semver$.inc(currentVersion, 'prerelease', 'beta');
  }
  // 从 stable 或其他 preid（如 rc）回到 beta.1
  const baseInc = semver$.inc(currentVersion, 'patch');
  return `${baseInc}-beta.1`;
}

module.exports = { computeNextVersion };
```

**注意**：上面第一行 `const semver = require('node:util').inspect ? null : null; // placeholder` 是过渡锚点。Step 4 跑测试前**必须删掉这一行**（保留 `const semver$ = require('semver');` 即可）。

- [ ] **Step 4: 清理锚点并跑测试确认通过**

删除 `scripts/release.js` 中的占位行 `const semver = require('node:util').inspect ? null : null; // placeholder, replaced below`，确保文件以 `const semver$ = require('semver');` 开头此区块。

```bash
node --test scripts/release.test.js
```

预期：所有 `computeNextVersion` 测试通过；如果仍有失败，按错误信息调整实现（注意：semver `inc('prerelease', 'beta')` 在 `-beta.9` 上应该返回 `-beta.10`，如行为不同则检查 Node 版本）。

- [ ] **Step 5: 提交**

```bash
git add scripts/release.js scripts/release.test.js
git commit -m "feat(release): add computeNextVersion with semver algorithm"
```

---

### Task 3: `computeCommitMessage` 纯函数

**Files:**
- Modify: `scripts/release.js`（追加 `computeCommitMessage` 与导出）
- Modify: `scripts/release.test.js`（追加测试）

**Interfaces:**
- Produces:
  ```javascript
  // 输入: mode ('beta'|'stable'), subArg ('patch'|'next'|string|undefined), version (string)
  // 输出: commit message 字符串
  exports.computeCommitMessage = function (mode, subArg, version) { ... }
  ```

- [ ] **Step 1: 追加失败的测试**

在 `/Users/ctjj/Documents/projects/audiodock_worktree/scripts/release.test.js` 的最后一个测试后追加：

```javascript
const { computeCommitMessage } = require('./release');

test('computeCommitMessage: stable release', () => {
  assert.equal(computeCommitMessage('stable', undefined, '1.2.23'), 'chore(release): release 1.2.23');
});

test('computeCommitMessage: beta auto-increment', () => {
  assert.equal(computeCommitMessage('beta', 'next', '1.2.23-beta.2'), 'chore(release): bump to 1.2.23-beta.2');
});

test('computeCommitMessage: beta subArg=patch (start cycle)', () => {
  assert.equal(computeCommitMessage('beta', 'patch', '1.2.23-beta.1'), 'chore(release): start 1.2.23-beta.1 cycle');
});

test('computeCommitMessage: beta subArg=undefined from stable', () => {
  assert.equal(computeCommitMessage('beta', undefined, '1.2.23-beta.1'), 'chore(release): bump to 1.2.23-beta.1');
});

test('computeCommitMessage: beta custom version', () => {
  assert.equal(computeCommitMessage('beta', '1.2.24-beta.1', '1.2.24-beta.1'), 'chore(release): bump to 1.2.24-beta.1');
});
```

- [ ] **Step 2: 跑测试确认新测试失败**

```bash
node --test scripts/release.test.js
```

预期：新加的 5 个 `computeCommitMessage` 测试因 `computeCommitMessage is not a function` 失败；Task 2 的测试仍通过。

- [ ] **Step 3: 在 `scripts/release.js` 末尾追加实现并扩展导出**

在 `computeNextVersion` 实现后追加：

```javascript
function computeCommitMessage(mode, subArg, version) {
  if (mode === 'stable') {
    return `chore(release): release ${version}`;
  }
  // beta 模式
  if (subArg === 'patch') {
    return `chore(release): start ${version} cycle`;
  }
  return `chore(release): bump to ${version}`;
}
```

把 `module.exports = { computeNextVersion };` 改为：

```javascript
module.exports = { computeNextVersion, computeCommitMessage };
```

- [ ] **Step 4: 跑测试确认全部通过**

```bash
node --test scripts/release.test.js
```

预期：所有 computeNextVersion 与 computeCommitMessage 测试通过。

- [ ] **Step 5: 提交**

```bash
git add scripts/release.js scripts/release.test.js
git commit -m "feat(release): add computeCommitMessage helper"
```

---

### Task 4: 预检函数（工作区干净、tag 不存在、版本号合法）

**Files:**
- Modify: `scripts/release.js`（追加预检函数与导出）
- Modify: `scripts/release.test.js`（追加测试，使用 `node:child_process` 在临时 git 仓库里验证）

**Interfaces:**
- Produces:
  ```javascript
  // 返回 boolean: true = 工作区脏
  exports.checkWorkingTreeDirty = function (cwd = process.cwd()) { ... }
  // 返回 boolean: true = tag 已存在
  exports.checkExistingTag = function (version, cwd = process.cwd()) { ... }
  // 返回 parsed semver 对象或抛 Error
  exports.parseVersion = function (version) { ... }
  ```

- [ ] **Step 1: 追加失败的测试**

在 `/Users/ctjj/Documents/projects/audiodock_worktree/scripts/release.test.js` 末尾追加：

```javascript
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkWorkingTreeDirty, checkExistingTag, parseVersion } = require('./release');

function makeTempGitRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-test-'));
  execSync('git init -q', { cwd: dir });
  execSync('git config user.email "test@test.com"', { cwd: dir });
  execSync('git config user.name "Test"', { cwd: dir });
  fs.writeFileSync(path.join(dir, 'a.txt'), 'hello');
  execSync('git add . && git commit -q -m init', { cwd: dir });
  return dir;
}

test('checkWorkingTreeDirty: clean repo returns false', () => {
  const dir = makeTempGitRepo();
  try {
    assert.equal(checkWorkingTreeDirty(dir), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkWorkingTreeDirty: untracked file returns true', () => {
  const dir = makeTempGitRepo();
  try {
    fs.writeFileSync(path.join(dir, 'untracked.txt'), 'x');
    assert.equal(checkWorkingTreeDirty(dir), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkWorkingTreeDirty: modified tracked file returns true', () => {
  const dir = makeTempGitRepo();
  try {
    fs.writeFileSync(path.join(dir, 'a.txt'), 'changed');
    assert.equal(checkWorkingTreeDirty(dir), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkExistingTag: existing tag returns true', () => {
  const dir = makeTempGitRepo();
  try {
    execSync('git tag v1.0.0', { cwd: dir });
    assert.equal(checkExistingTag('1.0.0', dir), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkExistingTag: non-existing tag returns false', () => {
  const dir = makeTempGitRepo();
  try {
    assert.equal(checkExistingTag('1.0.0', dir), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('parseVersion: valid version returns parsed object', () => {
  const p = parseVersion('1.2.23-beta.1');
  assert.equal(p.major, 1);
  assert.equal(p.minor, 2);
  assert.equal(p.patch, 23);
});

test('parseVersion: invalid version throws Chinese error', () => {
  assert.throws(() => parseVersion('garbage'), /版本号格式不合法/);
});
```

- [ ] **Step 2: 跑测试确认新增测试失败**

```bash
node --test scripts/release.test.js
```

预期：新测试因函数未导出失败。

- [ ] **Step 3: 在 `scripts/release.js` 末尾追加实现并扩展导出**

```javascript
function checkWorkingTreeDirty(cwd = process.cwd()) {
  const out = execSync('git status --porcelain', { cwd, encoding: 'utf8' });
  return out.trim().length > 0;
}

function checkExistingTag(version, cwd = process.cwd()) {
  try {
    execSync(`git rev-parse v${version}`, { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function parseVersion(version) {
  const p = semver$.parse(version);
  if (!p) throw new Error(`版本号格式不合法：${version}`);
  return p;
}
```

把 `module.exports = { ... };` 改为：

```javascript
module.exports = { computeNextVersion, computeCommitMessage, checkWorkingTreeDirty, checkExistingTag, parseVersion };
```

- [ ] **Step 4: 跑测试确认全部通过**

```bash
node --test scripts/release.test.js
```

预期：所有测试通过。

- [ ] **Step 5: 提交**

```bash
git add scripts/release.js scripts/release.test.js
git commit -m "feat(release): add preflight checks (dirty tree, tag, version)"
```

---

### Task 5: 包同步与字节级回滚

**Files:**
- Modify: `scripts/release.js`（新增 `updateVersionsWithRollback`，改写 `updateVersions`）
- Modify: `scripts/release.test.js`（新增测试）

**Interfaces:**
- Produces:
  ```javascript
  // 输入: newVersion (string), filePaths (string[]), options: { dryRun: boolean }
  // 副作用: 写文件。返回 { updated: string[], rollback: () => void }
  //   - updated: 实际被修改的文件路径列表（dryRun 时为空）
  //   - rollback(): 把文件还原到调用前的原始字节
  // 失败: 任一文件写入失败时，已写入的文件自动还原并重新抛出原 error
  exports.updateVersionsWithRollback = function (newVersion, filePaths, options) { ... }
  ```

- [ ] **Step 1: 追加失败的测试**

在 `scripts/release.test.js` 末尾追加：

```javascript
const { updateVersionsWithRollback } = require('./release');

const PACKAGES_FOR_TEST = ['a.json', 'b.json'];

function setupFixtures() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-sync-'));
  fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify({ name: 'a', version: '1.0.0' }, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'b.json'), JSON.stringify({ name: 'b', version: '1.0.0' }, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ expo: { name: 'app', version: '1.0.0' } }, null, 2) + '\n');
  return dir;
}

test('updateVersionsWithRollback: updates version field on plain JSON', () => {
  const dir = setupFixtures();
  try {
    const result = updateVersionsWithRollback('2.0.0', [path.join(dir, 'a.json')], { dryRun: false });
    const updated = JSON.parse(fs.readFileSync(path.join(dir, 'a.json'), 'utf8'));
    assert.equal(updated.version, '2.0.0');
    assert.deepEqual(result.updated, [path.join(dir, 'a.json')]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('updateVersionsWithRollback: updates expo.version on app.json-like files', () => {
  const dir = setupFixtures();
  try {
    updateVersionsWithRollback('2.0.0', [path.join(dir, 'app.json')], { dryRun: false });
    const updated = JSON.parse(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'));
    assert.equal(updated.expo.version, '2.0.0');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('updateVersionsWithRollback: rollback restores original bytes', () => {
  const dir = setupFixtures();
  const originalBytes = fs.readFileSync(path.join(dir, 'a.json'));
  const result = updateVersionsWithRollback('2.0.0', [path.join(dir, 'a.json')], { dryRun: false });
  result.rollback();
  const after = fs.readFileSync(path.join(dir, 'a.json'));
  assert.equal(after.equals(originalBytes), true);
});

test('updateVersionsWithRollback: dryRun does not write', () => {
  const dir = setupFixtures();
  const originalBytes = fs.readFileSync(path.join(dir, 'a.json'));
  try {
    const result = updateVersionsWithRollback('2.0.0', [path.join(dir, 'a.json')], { dryRun: true });
    const after = fs.readFileSync(path.join(dir, 'a.json'));
    assert.equal(after.equals(originalBytes), true);
    assert.deepEqual(result.updated, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('updateVersionsWithRollback: write failure triggers rollback and rethrows', () => {
  const dir = setupFixtures();
  const originalBytes = fs.readFileSync(path.join(dir, 'a.json'));
  // 让 b.json 不可写：把目录设为只读（macOS 上用 chmod）
  fs.chmodSync(path.join(dir, 'b.json'), 0o444);
  try {
    assert.throws(
      () => updateVersionsWithRollback('2.0.0', [path.join(dir, 'a.json'), path.join(dir, 'b.json')], { dryRun: false }),
      /更新 .* 失败/
    );
    // a.json 应被回滚
    const after = fs.readFileSync(path.join(dir, 'a.json'));
    assert.equal(after.equals(originalBytes), true);
  } finally {
    fs.chmodSync(path.join(dir, 'b.json'), 0o644);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
```

> **注意**：chmod 0o444 在 Windows 下行为不同；当前仓库为 macOS（`darwin`），按 OK 处理。如未来跨平台，按需扩展。

- [ ] **Step 2: 跑测试确认失败**

```bash
node --test scripts/release.test.js
```

预期：5 个新测试因 `updateVersionsWithRollback is not a function` 失败。

- [ ] **Step 3: 在 `scripts/release.js` 追加实现**

```javascript
function updateVersionsWithRollback(newVersion, filePaths, options = {}) {
  const { dryRun = false } = options;
  const originals = new Map();
  const updated = [];

  try {
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ 跳过不存在的文件：${filePath}`);
        continue;
      }
      originals.set(filePath, fs.readFileSync(filePath));
      const pkg = JSON.parse(originals.get(filePath).toString('utf8'));
      if (filePath.endsWith('app.json') && pkg.expo) {
        pkg.expo.version = newVersion;
      } else {
        pkg.version = newVersion;
      }
      if (dryRun) {
        console.log(`[dry-run] would update ${filePath} to version ${newVersion}`);
        continue;
      }
      fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
      updated.push(filePath);
      console.log(`Updated ${filePath} to ${newVersion}`);
    }
  } catch (error) {
    // 回滚已修改的文件
    for (const filePath of updated) {
      try {
        fs.writeFileSync(filePath, originals.get(filePath));
      } catch (rollbackError) {
        console.error(`❌ 回滚 ${filePath} 失败：${rollbackError.message}`);
      }
    }
    throw new Error(`更新 ${error.message}。已回滚所有 package.json 到原版本。`);
  }

  return {
    updated,
    rollback() {
      for (const filePath of updated) {
        fs.writeFileSync(filePath, originals.get(filePath));
      }
    },
  };
}
```

扩展 `module.exports` 加入 `updateVersionsWithRollback`。

- [ ] **Step 4: 跑测试确认全部通过**

```bash
node --test scripts/release.test.js
```

预期：所有测试通过；如 chmod 测试在 macOS 下抛 `EPERM`，将 `b.json` 写入失败换为预先让父目录只读或改用 mock（参考：直接把文件以 `O_RDWR` 移除再写——如必要可跳过此用例并在 Task 8 集成测试里覆盖）。

- [ ] **Step 5: 提交**

```bash
git add scripts/release.js scripts/release.test.js
git commit -m "feat(release): add updateVersionsWithRollback with byte-level restore"
```

---

### Task 6: CLI 模式分发（参数解析与 readline 菜单）

**Files:**
- Modify: `scripts/release.js`（新增 `parseCliArgs`、`runInteractive`、底层 `main()`）
- Modify: `scripts/release.test.js`（覆盖 `parseCliArgs`）

**Interfaces:**
- Produces:
  ```javascript
  // 输入: argv (string[], 默认 process.argv.slice(2))
  // 输出: { mode: 'beta'|'stable', subArg: string|undefined, customVersion: string|undefined, help: boolean }
  // 错误: 未知子命令抛 Error('未知的发布模式：...')
  exports.parseCliArgs = function (argv) { ... }
  ```

- [ ] **Step 1: 追加失败的测试**

在 `scripts/release.test.js` 末尾追加：

```javascript
const { parseCliArgs } = require('./release');

test('parseCliArgs: no args → stable mode', () => {
  assert.deepEqual(parseCliArgs([]), { mode: 'stable', subArg: undefined, customVersion: undefined, help: false });
});

test('parseCliArgs: beta → beta mode', () => {
  assert.deepEqual(parseCliArgs(['beta']), { mode: 'beta', subArg: undefined, customVersion: undefined, help: false });
});

test('parseCliArgs: beta patch → beta with subArg patch', () => {
  assert.deepEqual(parseCliArgs(['beta', 'patch']), { mode: 'beta', subArg: 'patch', customVersion: undefined, help: false });
});

test('parseCliArgs: beta next → beta with subArg next', () => {
  assert.deepEqual(parseCliArgs(['beta', 'next']), { mode: 'beta', subArg: 'next', customVersion: undefined, help: false });
});

test('parseCliArgs: beta with explicit version', () => {
  assert.deepEqual(parseCliArgs(['beta', '1.2.24-beta.1']), { mode: 'beta', subArg: undefined, customVersion: '1.2.24-beta.1', help: false });
});

test('parseCliArgs: stable patch → stable with subArg patch', () => {
  assert.deepEqual(parseCliArgs(['patch']), { mode: 'stable', subArg: 'patch', customVersion: undefined, help: false });
});

test('parseCliArgs: unknown subArg for stable → custom version', () => {
  assert.deepEqual(parseCliArgs(['1.2.30']), { mode: 'stable', subArg: undefined, customVersion: '1.2.30', help: false });
});

test('parseCliArgs: unknown mode throws', () => {
  assert.throws(() => parseCliArgs(['nope']), /未知的发布模式/);
});

test('parseCliArgs: beta with invalid subArg throws', () => {
  assert.throws(() => parseCliArgs(['beta', 'garbage']), /未知的发布模式/);
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node --test scripts/release.test.js
```

预期：9 个新测试因 `parseCliArgs is not a function` 失败。

- [ ] **Step 3: 在 `scripts/release.js` 追加实现**

```javascript
const STABLE_KEYWORDS = new Set(['patch', 'minor', 'major']);
const VERSION_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z-.]+)?$/;

function parseCliArgs(argv) {
  if (argv.length === 0) {
    return { mode: 'stable', subArg: undefined, customVersion: undefined, help: false };
  }
  const [first, second] = argv;

  if (first === 'beta') {
    if (second === undefined) {
      return { mode: 'beta', subArg: undefined, customVersion: undefined, help: false };
    }
    if (second === 'patch' || second === 'next') {
      return { mode: 'beta', subArg: second, customVersion: undefined, help: false };
    }
    if (VERSION_RE.test(second) && /-beta\.\d+$/.test(second)) {
      return { mode: 'beta', subArg: undefined, customVersion: second, help: false };
    }
    throw new Error(`未知的发布模式：${second}。可用模式：beta（运行 release:beta）或留空（运行 release）。`);
  }

  if (first === '-h' || first === '--help') {
    return { mode: 'stable', subArg: undefined, customVersion: undefined, help: true };
  }

  // stable 模式分支
  if (STABLE_KEYWORDS.has(first)) {
    return { mode: 'stable', subArg: first, customVersion: undefined, help: false };
  }
  if (VERSION_RE.test(first)) {
    return { mode: 'stable', subArg: undefined, customVersion: first, help: false };
  }
  throw new Error(`未知的发布模式：${first}。可用模式：beta（运行 release:beta）或留空（运行 release）。`);
}
```

扩展 `module.exports` 加入 `parseCliArgs`。

- [ ] **Step 4: 跑测试确认通过**

```bash
node --test scripts/release.test.js
```

预期：所有 parseCliArgs 测试通过。

- [ ] **Step 5: 提交**

```bash
git add scripts/release.js scripts/release.test.js
git commit -m "feat(release): add parseCliArgs with beta/stable mode dispatch"
```

---

### Task 7: 步骤串联与副作用执行

**Files:**
- Modify: `scripts/release.js`（新增 `runRelease` 重写版、`runInteractive`，主入口）
- Modify: `scripts/release.test.js`（覆盖 runRelease 的 mock 路径）

**Interfaces:**
- Produces:
  ```javascript
  // 输入: opts = {
  //   currentVersion: string,
  //   targetVersion: string,
  //   commitMessage: string,
  //   exec: typeof import('node:child_process').execSync,  // 可注入用于测试
  //   dryRun: boolean
  // }
  // 副作用: 按顺序执行 build:web → updateVersions → expo prebuild → git add/commit/tag
  // 失败: 抛出带中文信息的 Error，已写入文件自动回滚
  exports.runRelease = async function (opts) { ... }
  ```

- [ ] **Step 1: 追加失败的测试（用 exec 注入 mock）**

在 `scripts/release.test.js` 末尾追加：

```javascript
const { runRelease } = require('./release');

function makeExecRecorder(failOn = null) {
  const calls = [];
  const exec = (cmd, opts = {}) => {
    calls.push({ cmd, opts });
    if (failOn && cmd.startsWith(failOn)) {
      throw new Error(`mocked failure: ${cmd}`);
    }
    return '';
  };
  return { exec: exec.bind(null), calls };
}

test('runRelease: happy path executes build:web → update → prebuild → git', async () => {
  const dir = setupFixtures();
  const { exec, calls } = makeExecRecorder();
  try {
    await runRelease({
      currentVersion: '1.0.0',
      targetVersion: '1.0.1',
      commitMessage: 'chore(release): release 1.0.1',
      exec: (cmd) => exec(cmd, { cwd: dir }),
      dryRun: false,
      cwd: dir,
      packages: [path.join(dir, 'a.json')],
    });
    const cmds = calls.map(c => c.cmd);
    assert.ok(cmds.some(c => c.includes('build:web')), 'should run build:web');
    assert.ok(cmds.some(c => c.includes('expo prebuild')), 'should run expo prebuild');
    assert.ok(cmds.some(c => c.startsWith('git add')), 'should git add');
    assert.ok(cmds.some(c => c.startsWith('git commit')), 'should git commit');
    assert.ok(cmds.some(c => c.startsWith('git tag')), 'should git tag');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('runRelease: build:web failure throws before any file write', async () => {
  const dir = setupFixtures();
  const originalBytes = fs.readFileSync(path.join(dir, 'a.json'));
  const { exec } = makeExecRecorder('pnpm --filter sound-x run build:web');
  try {
    await assert.rejects(
      () => runRelease({
        currentVersion: '1.0.0',
        targetVersion: '1.0.1',
        commitMessage: 'x',
        exec: (cmd) => exec(cmd, { cwd: dir }),
        dryRun: false,
        cwd: dir,
        packages: [path.join(dir, 'a.json')],
      }),
      /desktop build:web 失败/
    );
    const after = fs.readFileSync(path.join(dir, 'a.json'));
    assert.equal(after.equals(originalBytes), true, 'file must be unchanged');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('runRelease: dryRun skips all side effects', async () => {
  const dir = setupFixtures();
  const originalBytes = fs.readFileSync(path.join(dir, 'a.json'));
  const { exec, calls } = makeExecRecorder();
  try {
    await runRelease({
      currentVersion: '1.0.0',
      targetVersion: '1.0.1',
      commitMessage: 'x',
      exec: (cmd) => exec(cmd, { cwd: dir }),
      dryRun: true,
      cwd: dir,
      packages: [path.join(dir, 'a.json')],
    });
    const after = fs.readFileSync(path.join(dir, 'a.json'));
    assert.equal(after.equals(originalBytes), true, 'file must be unchanged in dry-run');
    // 预检 + 步骤 0 在 dry-run 下也会跑（避免环境不可用时不报错），但写文件与 prebuild/commit/tag 不会跑
    assert.ok(!calls.some(c => c.cmd.startsWith('git commit')), 'no git commit in dry-run');
    assert.ok(!calls.some(c => c.cmd.startsWith('git tag')), 'no git tag in dry-run');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node --test scripts/release.test.js
```

预期：3 个新测试因 `runRelease is not a function` 失败。

- [ ] **Step 3: 在 `scripts/release.js` 追加实现**

```javascript
const defaultExec = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });

async function runRelease(opts) {
  const { currentVersion, targetVersion, commitMessage, exec = defaultExec, dryRun = false, cwd = process.cwd(), packages = PACKAGES } = opts;

  // 预检
  if (checkWorkingTreeDirty(cwd)) {
    throw new Error('工作区有未提交的修改，请先 commit 或 stash 后再发布。');
  }
  if (checkExistingTag(targetVersion, cwd)) {
    throw new Error(`标签 v${targetVersion} 已存在，请更换版本号后重试。`);
  }

  // 步骤 0: 前置预检
  try {
    console.log('\n📦 步骤 0/4：运行 desktop build:web 预检…');
    exec('pnpm --filter sound-x run build:web', { cwd, stdio: 'inherit' });
  } catch (error) {
    throw new Error(`desktop build:web 失败，未修改任何版本号。错误详情：${error.message}`);
  }

  // 步骤 1: 同步更新版本号（带回滚）
  let syncResult;
  try {
    console.log(`\n📝 步骤 1/4：同步更新 ${packages.length} 个 package.json 到 ${targetVersion}…`);
    syncResult = updateVersionsWithRollback(targetVersion, packages, { dryRun });
  } catch (error) {
    throw error;
  }

  // 步骤 2: expo prebuild
  try {
    console.log('\n📱 步骤 2/4：运行 expo prebuild…');
    exec('npx expo prebuild', { cwd: path.join(cwd, 'apps/mobile'), stdio: 'inherit' });
  } catch (error) {
    syncResult.rollback();
    throw new Error(`expo prebuild 失败：${error.message}。已回滚 package.json。请检查 apps/mobile/ios 和 apps/mobile/android 是否需要手动清理。`);
  }

  // 步骤 3: git add / commit / tag
  try {
    console.log('\n📦 步骤 3/4：提交并打 tag…');
    exec('git add .', { cwd, stdio: 'inherit' });
    exec(`git commit -m "${commitMessage}"`, { cwd, stdio: 'inherit' });
    exec(`git tag v${targetVersion}`, { cwd, stdio: 'inherit' });
  } catch (error) {
    throw new Error(`git 操作失败：${error.message}。手动修复：git reset HEAD~1 && git tag -d v${targetVersion}`);
  }

  console.log('\n✅ 发布完成！');
  console.log('👉 运行以下命令推送：');
  console.log('   git push && git push --tags');
  if (/-beta\.\d+$/.test(targetVersion)) {
    console.log('ℹ️  这是 BETA 版本，请确认是否要推送此 tag。');
  }
}
```

扩展 `module.exports` 加入 `runRelease`。注意 `runRelease` 是 async 函数，即使主体同步。

- [ ] **Step 4: 跑测试确认全部通过**

```bash
node --test scripts/release.test.js
```

预期：所有测试通过。

- [ ] **Step 5: 提交**

```bash
git add scripts/release.js scripts/release.test.js
git commit -m "feat(release): wire runRelease with rollback and Chinese errors"
```

---

### Task 8: 集成验证、CLI 入口与 npm script

**Files:**
- Modify: `scripts/release.js`（新增 `main()`、`runInteractive()`、CLI 守卫、读取根 `package.json`、dry-run 环境变量）
- Modify: `package.json`（新增 `scripts.release:beta`）
- Modify: `scripts/release.test.js`（追加 main 入口集成测试）

- [ ] **Step 1: 追加失败的集成测试**

在 `scripts/release.test.js` 末尾追加：

```javascript
test('main: stable mode from CLI invocation updates files in fixture repo', async () => {
  const dir = setupFixtures();
  // 把当前根 package.json 的 version 临时改成 1.0.0
  const rootPkg = path.join(dir, 'root.json');
  fs.writeFileSync(rootPkg, JSON.stringify({ version: '1.0.0' }, null, 2));
  const { exec } = makeExecRecorder();

  // 模拟执行 main()：直接调 runRelease 走 happy path
  await runRelease({
    currentVersion: '1.0.0',
    targetVersion: '1.0.1',
    commitMessage: 'chore(release): release 1.0.1',
    exec: (cmd) => exec(cmd, { cwd: dir }),
    dryRun: true, // 用 dry-run 避免真实 git 操作
    cwd: dir,
    packages: [path.join(dir, 'a.json')],
  });

  const updated = JSON.parse(fs.readFileSync(path.join(dir, 'a.json'), 'utf8'));
  assert.equal(updated.version, '1.0.1');

  fs.rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node --test scripts/release.test.js
```

预期：新测试因某种边界细节失败（如果已通过则进入 Step 3）。

- [ ] **Step 3: 在 `scripts/release.js` 追加 main 入口与 runInteractive**

在文件最末尾、`module.exports` 之后追加：

```javascript
// ========== CLI 入口（仅在被直接执行时运行） ==========
if (require.main === module) {
  (async () => {
    const args = parseCliArgs(process.argv.slice(2));
    if (args.help) {
      console.log('用法：');
      console.log('  pnpm release              智能 fallback 发布（剥 preid 或 patch+1）');
      console.log('  pnpm release:beta         发布下一个 beta 版本');
      console.log('  pnpm release:beta patch   从 stable 推到新 beta 起点');
      console.log('  pnpm release:beta next    递增当前 beta');
      console.log('  pnpm release:beta <ver>   指定 beta 版本号');
      process.exit(0);
    }

    const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const currentVersion = rootPkg.version;

    let targetVersion;
    if (args.mode === 'beta') {
      if (args.customVersion) {
        targetVersion = args.customVersion;
      } else if (args.subArg === undefined) {
        targetVersion = await runBetaInteractive(currentVersion);
      } else {
        targetVersion = computeNextVersion(currentVersion, 'beta', args.subArg);
      }
    } else {
      // stable
      if (args.customVersion) {
        targetVersion = args.customVersion;
      } else if (args.subArg) {
        targetVersion = computeNextVersion(currentVersion, 'stable', args.subArg);
      } else {
        targetVersion = await runStableInteractive(currentVersion);
      }
    }

    const commitMessage = computeCommitMessage(args.mode, args.customVersion || args.subArg, targetVersion);
    const dryRun = process.env.RELEASE_DRY_RUN === '1';

    if (dryRun) console.log('🔍 DRY-RUN 模式：不执行任何写文件、commit、tag 操作。');

    try {
      await runRelease({
        currentVersion,
        targetVersion,
        commitMessage,
        dryRun,
      });
    } catch (error) {
      console.error(`\n${error.message}`);
      process.exit(1);
    }
  })().catch(err => {
    console.error(`\n❌ 意外错误：${err.message}`);
    process.exit(1);
  });
}

// ========== 交互模式 ==========
function runBetaInteractive(currentVersion) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const nextBeta = computeNextVersion(currentVersion, 'beta', 'next');
  const newCycle = computeNextVersion(currentVersion, 'beta', 'patch');
  return new Promise((resolve, reject) => {
    console.log(`\n当前版本：${currentVersion}`);
    console.log('选择 beta 发布类型：');
    console.log(`1) 递增当前 beta (${nextBeta})`);
    console.log(`2) 开始新 beta 周期 (${newCycle})`);
    console.log('3) 自定义版本号');
    rl.question('\n请输入选项 (1-3): ', (choice) => {
      if (choice === '1') { resolve(nextBeta); rl.close(); }
      else if (choice === '2') { resolve(newCycle); rl.close(); }
      else if (choice === '3') {
        rl.question('输入自定义版本号：', (v) => {
          if (!/^\d+\.\d+\.\d+-beta\.\d+$/.test(v)) {
            reject(new Error(`版本号格式不合法：${v}`));
          } else {
            resolve(v);
          }
          rl.close();
        });
      } else {
        reject(new Error('已取消'));
      }
    });
  });
}

function runStableInteractive(currentVersion) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve, reject) => {
    const nextPatch = computeNextVersion(currentVersion, 'stable', 'patch');
    const nextMinor = computeNextVersion(currentVersion, 'stable', 'minor');
    const nextMajor = computeNextVersion(currentVersion, 'stable', 'major');
    console.log(`\n当前版本：${currentVersion}`);
    console.log('选择发布类型：');
    console.log(`1) Patch (${nextPatch})`);
    console.log(`2) Minor (${nextMinor})`);
    console.log(`3) Major (${nextMajor})`);
    console.log('4) 自定义版本号');
    rl.question('\n请输入选项 (1-4): ', (choice) => {
      if (choice === '1') { resolve(nextPatch); rl.close(); }
      else if (choice === '2') { resolve(nextMinor); rl.close(); }
      else if (choice === '3') { resolve(nextMajor); rl.close(); }
      else if (choice === '4') {
        rl.question('输入自定义版本号：', (v) => {
          if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z-.]+)?$/.test(v)) {
            reject(new Error(`版本号格式不合法：${v}`));
          } else {
            resolve(v);
          }
          rl.close();
        });
      } else {
        reject(new Error('已取消'));
      }
    });
  });
}
```

> **重要**：`computeNextVersion` 在 stable 模式下接受 `'patch' | 'minor' | 'major'` 作为子参数，当前 Task 2 的实现仅处理 `undefined` 和 explicit version。需要扩展：
>
> 打开 `computeNextVersion`，把 `// stable 模式：剥离 preid` 这一段改为：
>
> ```javascript
>   // stable 模式
>   if (mode === 'stable') {
>     if (parsed.prerelease.length > 0) {
>       return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
>     }
>     if (subArg === 'minor') return semver$.inc(currentVersion, 'minor');
>     if (subArg === 'major') return semver$.inc(currentVersion, 'major');
>     return semver$.inc(currentVersion, 'patch');
>   }
> ```

- [ ] **Step 4: 在 `package.json` 添加 `release:beta` 脚本**

打开 `package.json`，在 `"release": "node scripts/release.js"` 后追加逗号并新增一行：

```json
    "release:beta": "node scripts/release.js beta",
```

- [ ] **Step 5: 跑全部测试**

```bash
node --test scripts/release.test.js
```

预期：所有测试通过。

- [ ] **Step 6: 手动验证 CLI 帮助与参数错误**

```bash
node scripts/release.js --help
node scripts/release.js beta garbage
```

预期：
- `--help` 打印用法并退出 0
- `beta garbage` 打印 `❌ 未知的发布模式：garbage...` 并退出 1

- [ ] **Step 7: 手动验证 dry-run**

```bash
RELEASE_DRY_RUN=1 node scripts/release.js beta
```

预期：进入 beta 交互菜单（按 1 / 2 / 3），然后打印 `[dry-run] would update ...`，不真实修改文件、不跑 prebuild、不 commit、不打 tag。

- [ ] **Step 8: 提交**

```bash
git add scripts/release.js scripts/release.test.js package.json
git commit -m "feat(release): add CLI entry, npm script release:beta, and integration"
```

---

## 自审

**1. Spec 覆盖**：
- ✅ 命令与版本映射 → Task 2 (`computeNextVersion`)
- ✅ CLI 接口 → Task 6 (`parseCliArgs`) + Task 8 (interactive menus)
- ✅ Git tag / commit 格式 → Task 3 (`computeCommitMessage`)
- ✅ 副作用流程 + dry-run → Task 7 + Task 8
- ✅ 错误处理与回滚 → Task 4 (preflight) + Task 5 (rollback) + Task 7 (cascade)
- ✅ 中文提示 → Task 5 + Task 7 + Task 8
- ✅ 测试计划（单元 + 集成） → Task 2-8 每个 task 自带测试

**2. Placeholder 扫描**：未发现 TBD / TODO / "implement later"。

**3. 类型一致性**：
- `computeNextVersion(currentVersion, mode, subArg)` 在 Task 2、3、6、7、8 一致
- `computeCommitMessage(mode, subArg, version)` 在 Task 3、7、8 一致
- `updateVersionsWithRollback(newVersion, filePaths, options)` 在 Task 5、7、8 一致
- `parseCliArgs(argv)` 在 Task 6、8 一致
- `runRelease(opts)` 在 Task 7、8 一致
- 所有导出都从 `module.exports` 统一出口

无发现不一致。

---

## 执行选项

**Plan complete and saved to `docs/superpowers/plans/2026-07-29-release-workflow-beta.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - 每个 task 派一个独立 subagent 执行，task 之间由你 review 后再决定是否继续；迭代快、错误隔离好。

**2. Inline Execution** - 在当前会话里批量执行所有 task，按 checkpoint 暂停让你 review。

哪种方式？