
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

    runRelease(targetVersion);
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
          runRelease(custom);
          rl.close();
        });
        return;
      } else {
        console.log('Cancelled.');
        process.exit(0);
      }

      if (targetVersion) {
        runRelease(targetVersion);
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

function runRelease(newVersion) {
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

module.exports = { computeNextVersion };
