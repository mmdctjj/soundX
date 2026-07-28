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
