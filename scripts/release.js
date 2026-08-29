
const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const semver$ = require('semver');

const PACKAGES = [
  'package.json',
  'apps/desktop/package.json',
  'apps/desktop/src-tauri/tauri.conf.json',
  'apps/desktop/src-tauri/Cargo.toml',
  'apps/mobile/package.json',
  'apps/mobile/app.json',
  'apps/harmony/AppScope/app.json5',
  'packages/i18e/package.json',
  'services/api/package.json',
  'packages/db/package.json',
  'packages/utils/package.json',
  'packages/ws/package.json'
];

const STABLE_KEYWORDS = new Set(['patch', 'minor', 'major']);
const VERSION_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z-.]+)?$/;

const defaultExec = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });


// 1. Get current version（CLI 入口内部也会再读取一次，这里供模块加载期引用）
const rootPkgPath = 'package.json';
if (!fs.existsSync(rootPkgPath)) {
  console.error('Error: package.json not found in root.');
  process.exit(1);
}

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

  // stable 模式
  if (mode === 'stable') {
    if (parsed.prerelease.length > 0) {
      return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
    }
    if (subArg === 'minor') return semver$.inc(currentVersion, 'minor');
    if (subArg === 'major') return semver$.inc(currentVersion, 'major');
    return semver$.inc(currentVersion, 'patch');
  }

  // beta 模式
  const hasBetaPrerelease = parsed.prerelease[0] === 'beta' && typeof parsed.prerelease[1] === 'number';
  if (hasBetaPrerelease && subArg !== 'patch') {
    return semver$.inc(currentVersion, 'prerelease', 'beta');
  }
  // 从 stable 或其他 preid（如 rc）回到 beta.1（手动 +1，避免 semver.inc('1.2.23-beta.2','patch') 返回 1.2.23）
  const baseInc = `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  return `${baseInc}-beta.1`;
}

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

module.exports = { computeNextVersion, computeCommitMessage, checkWorkingTreeDirty, checkExistingTag, parseVersion, updateVersionsWithRollback, renderUpdatedContent, stripPrerelease, parseCliArgs, runRelease };

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

/**
 * 剥离 pre-release 后缀：'1.2.2-beta.3' → '1.2.2'
 * 用于 Tauri / Cargo / HarmonyOS 等不支持 pre-release 版本号的载体。
 */
function stripPrerelease(version) {
  return version.split('-')[0];
}

/**
 * 按文件类型生成更新后的内容（纯文本层面，不写盘）。
 * - Cargo.toml：只替换 [package] 段的 version（正则限定段内，避开依赖段）
 * - app.json5（HarmonyOS AppScope）：改 app.versionName + app.versionCode 自动 +1
 * - app.json（expo）：改 expo.version
 * - 其余 JSON：改 version
 */
function renderUpdatedContent(filePath, content, newVersion) {
  const baseVersion = stripPrerelease(newVersion);

  if (filePath.endsWith('.toml')) {
    // 仅匹配 [package] 段内行首的 version = "..."（到下一个段头为止）
    const pkgSectionRe = /(\[package\][\s\S]*?^version\s*=\s*")([^"]+)(")/m;
    if (!pkgSectionRe.test(content)) {
      throw new Error(`${filePath} 中未找到 [package] 段的 version 字段`);
    }
    return content.replace(pkgSectionRe, `$1${baseVersion}$3`);
  }

  const pkg = JSON.parse(content);

  if (filePath.endsWith('app.json5')) {
    if (!pkg.app) throw new Error(`${filePath} 缺少 app 字段`);
    pkg.app.versionName = baseVersion;
    if (typeof pkg.app.versionCode === 'number') {
      pkg.app.versionCode += 1;
    } else {
      throw new Error(`${filePath} 的 app.versionCode 不是数字`);
    }
    return JSON.stringify(pkg, null, 2) + '\n';
  }

  if (filePath.endsWith('app.json') && pkg.expo) {
    pkg.expo.version = newVersion;
    return JSON.stringify(pkg, null, 2) + '\n';
  }

  // tauri.conf.json 及各 package.json：tauri/Cargo 语义版本不支持 -beta 后缀
  pkg.version = filePath.includes('src-tauri') ? baseVersion : newVersion;
  return JSON.stringify(pkg, null, 2) + '\n';
}

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
      const newContent = renderUpdatedContent(filePath, originals.get(filePath).toString('utf8'), newVersion);
      if (dryRun) {
        console.log(`[dry-run] would update ${filePath} to version ${newVersion}`);
        continue;
      }
      fs.writeFileSync(filePath, newContent);
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
    throw new Error(`更新 ${error.message} 失败。已回滚所有版本文件到原版本。`);
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
    console.log(`\n📝 步骤 1/4：同步更新 ${packages.length} 个版本文件到 ${targetVersion}…`);
    syncResult = updateVersionsWithRollback(targetVersion, packages, { dryRun });
  } catch (error) {
    throw error;
  }

  if (dryRun) {
    return;
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
