import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findMissingScripts } from './check-agents-commands.mjs';

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-agents-commands.mjs');

function run(files) {
  const dir = mkdtempSync(join(tmpdir(), 'agents-check-'));
  try {
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
    return spawnSync('node', [script, dir], { encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('existing script is not reported', () => {
  assert.deepEqual(findMissingScripts('Kjør `pnpm run build`', { build: 'x' }), []);
});

test('missing script is reported with its line number', () => {
  assert.deepEqual(findMissingScripts('# Tittel\n\nKjør pnpm run lint\n', { build: 'x' }), [
    { line: 3, command: 'pnpm run lint', script: 'lint' },
  ]);
});

test('npm run is checked like pnpm run', () => {
  assert.deepEqual(findMissingScripts('npm run lint', {}), [
    { line: 1, command: 'npm run lint', script: 'lint' },
  ]);
});

test('script name with colon (test:e2e) followed by a backtick and a full stop is parsed as test:e2e', () => {
  assert.deepEqual(findMissingScripts('Bruk `pnpm run test:e2e`.', {}), [
    { line: 1, command: 'pnpm run test:e2e', script: 'test:e2e' },
  ]);
  assert.deepEqual(findMissingScripts('Bruk `pnpm run test:e2e`.', { 'test:e2e': 'x' }), []);
});

test('script name with underscore, dash and digits is parsed in full', () => {
  assert.deepEqual(findMissingScripts('pnpm run Build_2-x', {}), [
    { line: 1, command: 'pnpm run Build_2-x', script: 'Build_2-x' },
  ]);
});

test('the same missing script on two lines yields two entries', () => {
  const result = findMissingScripts('pnpm run lint\nnoe annet\npnpm run lint', {});
  assert.deepEqual(result.map((r) => r.line), [1, 3]);
});

test('empty scripts object reports every command', () => {
  const result = findMissingScripts('pnpm run a\nnpm run b', {});
  assert.deepEqual(result.map((r) => r.script), ['a', 'b']);
});

test('CRLF input gives correct line numbers', () => {
  const result = findMissingScripts('a\r\nb\r\npnpm run lint\r\n', {});
  assert.deepEqual(result, [{ line: 3, command: 'pnpm run lint', script: 'lint' }]);
});

test('pnpm install and pnpm exec are ignored', () => {
  assert.deepEqual(findMissingScripts('pnpm install\npnpm exec tsc\nnpm install', {}), []);
});

test('script names that are properties of Object.prototype are reported', () => {
  assert.equal(findMissingScripts('pnpm run constructor', {}).length, 1);
});

test('a word ending in npm is not treated as the command', () => {
  assert.deepEqual(findMissingScripts('mynpm run foo', {}), []);
});

test('CLI: no AGENTS.md exits 0', () => {
  const r = run({ 'package.json': '{}' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Ingen AGENTS\.md, hopper over/);
});

test('CLI: no package.json exits 0', () => {
  const r = run({ 'AGENTS.md': 'pnpm run build' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Ingen package\.json, hopper over/);
});

test('CLI: package.json without a scripts field reports the command and exits 1', () => {
  const r = run({ 'AGENTS.md': 'x\npnpm run build', 'package.json': '{"name":"a"}' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /AGENTS\.md:2: "pnpm run build" finnes ikke som script i package\.json/);
});

test('CLI: all scripts present prints OK and exits 0', () => {
  const r = run({ 'AGENTS.md': 'pnpm run build', 'package.json': '{"scripts":{"build":"x"}}' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), 'OK');
});

test('CLI: reports a missing script when started through a symlinked scripts directory', () => {
  const link = join(mkdtempSync(join(tmpdir(), 'agents-check-link-')), 'scripts');
  symlinkSync(dirname(script), link);
  const dir = mkdtempSync(join(tmpdir(), 'agents-check-'));
  writeFileSync(join(dir, 'AGENTS.md'), 'pnpm run build');
  writeFileSync(join(dir, 'package.json'), '{}');
  const r = spawnSync('node', [join(link, 'check-agents-commands.mjs'), dir], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /AGENTS\.md:1: "pnpm run build" finnes ikke/);
});

test('a trailing colon after the script name is not part of the name', () => {
  assert.deepEqual(findMissingScripts('Kjør pnpm run build: det bygger', { build: 'x' }), []);
  assert.deepEqual(findMissingScripts('Kjør pnpm run build: det bygger', {}), [
    { line: 1, command: 'pnpm run build', script: 'build' },
  ]);
});

test('a trailing dash after the script name is not part of the name', () => {
  assert.deepEqual(findMissingScripts('pnpm run build- og så videre', { build: 'x' }), []);
});

test('a flag after run is not reported as a script name', () => {
  assert.deepEqual(findMissingScripts('pnpm run --if-present build', {}), []);
});

test('a script name keeps its inner colon and starts with a letter', () => {
  assert.deepEqual(findMissingScripts('pnpm run test:e2e: ok', {}), [
    { line: 1, command: 'pnpm run test:e2e', script: 'test:e2e' },
  ]);
});

test('a one-character script name is parsed', () => {
  assert.deepEqual(findMissingScripts('pnpm run b', {}), [
    { line: 1, command: 'pnpm run b', script: 'b' },
  ]);
  assert.deepEqual(findMissingScripts('pnpm run b.', { b: 'x' }), []);
});

test('a script name may start with an underscore or a digit', () => {
  assert.deepEqual(findMissingScripts('pnpm run _x', {}).map((r) => r.script), ['_x']);
  assert.deepEqual(findMissingScripts('pnpm run 1x', {}).map((r) => r.script), ['1x']);
});

test('a script name may end with an underscore', () => {
  assert.deepEqual(findMissingScripts('pnpm run lint_ nå', {}).map((r) => r.script), ['lint_']);
});
