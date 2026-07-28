
const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const PACKAGES = [
  'package.json',
  'apps/desktop/package.json',
  'apps/mobile/package.json',
  'apps/mobile/app.json',
  'packages/i18e/package.json',
  'services/api/package.json',
  'packages/db/package.json',
  'packages/utils/package.json',
  'packages/ws/package.json'
];

// 1. Get current version
const rootPkgPath = 'package.json';
if (!fs.existsSync(rootPkgPath)) {
  console.error('Error: package.json not found in root.');
  process.exit(1);
}
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const currentVersion = rootPkg.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Helper to increment version
function incrementVersion(type) {
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  if (type === 'patch') return `${major}.${minor}.${patch + 1}`;
  return null;
}

if (require.main === module) {
  console.log(`Current version: ${currentVersion}`);

  // 2. Determine Target Version
  const arg = process.argv[2]; // e.g., 'patch', 'minor', '1.0.1'

  if (arg) {
    let targetVersion = incrementVersion(arg);

    // If arg is not a keyword, assume it's a specific version
    if (!targetVersion) {
      if (/^\d+\.\d+\.\d+/.test(arg)) {
        targetVersion = arg;
      } else {
        console.error(`Invalid argument: ${arg}. Use 'patch', 'minor', 'major' or specific version.`);
        process.exit(1);
      }
    }

    legacyRunRelease(targetVersion);
  } else {
    // Interactive Mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const nextPatch = incrementVersion('patch');
    const nextMinor = incrementVersion('minor');
    const nextMajor = incrementVersion('major');

    console.log('\nSelect release type:');
    console.log(`1) Patch (${nextPatch})`);
    console.log(`2) Minor (${nextMinor})`);
    console.log(`3) Major (${nextMajor})`);
    console.log(`4) Custom Version`);

    rl.question('\nEnter choice (1-4): ', (choice) => {
      let targetVersion = null;

      if (choice === '1') targetVersion = nextPatch;
      else if (choice === '2') targetVersion = nextMinor;
      else if (choice === '3') targetVersion = nextMajor;
      else if (choice === '4') {
        rl.question('Enter custom version: ', (custom) => {
          if (!/^\d+\.\d+\.\d+/.test(custom)) {
             console.error('Invalid format.');
             process.exit(1);
          }
          legacyRunRelease(custom);
          rl.close();
        });
        return;
      } else {
        console.log('Cancelled.');
        process.exit(0);
      }

      if (targetVersion) {
        legacyRunRelease(targetVersion);
      }
      rl.close();
    });
  }
}

function updateVersions(newVersion) {
  PACKAGES.forEach(pkgPath => {
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkgPath.endsWith('app.json') && pkg.expo) {
        pkg.expo.version = newVersion;
      } else {
        pkg.version = newVersion;
      }
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`Updated ${pkgPath} to ${newVersion}`);
    } else {
      console.warn(`Warning: ${pkgPath} skipping (not found).`);
    }
  });
}

function legacyRunRelease(newVersion) {
  console.log(`\n🚀 Preparing to release version: ${newVersion}\n`);

  // 1. Update files
  updateVersions(newVersion);

  // 2. Regenerate native projects after app.json version changes
  try {
    console.log('\n📱 Running expo prebuild in apps/mobile...');
    execSync('npx expo prebuild', {
      cwd: path.resolve('apps/mobile'),
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('❌ expo prebuild failed:', error.message);
    process.exit(1);
  }

  // 3. Commit and Tag
  try {
    console.log('\n📦 Committing changes...');
    execSync('git add .');
    execSync(`git commit -m "chore(release): bump version to ${newVersion}"`);
    
    console.log(`🏷️  Creating tag v${newVersion}...`);
    execSync(`git tag v${newVersion}`);

    console.log('\n✅ Success! New version created.');
    console.log('👉 Run this command to publish:');
    console.log('   git push && git push --tags');
  } catch (error) {
    console.error('❌ Git operations failed:', error.message);
    console.log('You may need to commit/tag manually.');
  }
}

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

module.exports = { computeNextVersion, computeCommitMessage, checkWorkingTreeDirty, checkExistingTag, parseVersion, updateVersionsWithRollback, parseCliArgs, runReleasePipeline };

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
    throw new Error(`更新 ${error.message} 失败。已回滚所有 package.json 到原版本。`);
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

const defaultExec = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });

async function runReleasePipeline(opts) {
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
