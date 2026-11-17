import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pluginsNeedingBump } from './check-version-bump.mjs';

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-version-bump.mjs');

test('changed skill without bump is reported', () => {
  const result = pluginsNeedingBump({
    changedFiles: ['plugins/frontend/skills/astro/SKILL.md'],
    baseVersions: { frontend: '1.0.0' },
    headVersions: { frontend: '1.0.0' },
  });
  assert.deepEqual(result, ['frontend']);
});

test('changed skill with bump is not reported', () => {
  const result = pluginsNeedingBump({
    changedFiles: ['plugins/frontend/skills/astro/SKILL.md'],
    baseVersions: { frontend: '1.0.0' },
    headVersions: { frontend: '1.0.1' },
  });
  assert.deepEqual(result, []);
});

test('plugin missing on base needs no bump', () => {
  const result = pluginsNeedingBump({
    changedFiles: ['plugins/backend/skills/x/SKILL.md'],
    baseVersions: { backend: undefined },
    headVersions: { backend: '1.0.0' },
  });
  assert.deepEqual(result, []);
});

test('deleted file inside a plugin counts as a change', () => {
  const result = pluginsNeedingBump({
    changedFiles: ['plugins/workflow/agents/old.agent.md'],
    baseVersions: { workflow: '2.0.0' },
    headVersions: { workflow: '2.0.0' },
  });
  assert.deepEqual(result, ['workflow']);
});

test('changes outside plugins/ are ignored', () => {
  const result = pluginsNeedingBump({
    changedFiles: ['README.md', 'scripts/validate-plugins.mjs', 'pluginsx/frontend/a.md'],
    baseVersions: { frontend: '1.0.0' },
    headVersions: { frontend: '1.0.0' },
  });
  assert.deepEqual(result, []);
});

test('a change in one plugin does not flag another', () => {
  const result = pluginsNeedingBump({
    changedFiles: ['plugins/frontend/skills/astro/SKILL.md'],
    baseVersions: { frontend: '1.0.0', backend: '1.0.0' },
    headVersions: { frontend: '1.0.1', backend: '1.0.0' },
  });
  assert.deepEqual(result, []);
});

test('plugin without a version on either side is not reported', () => {
  const result = pluginsNeedingBump({
    changedFiles: ['plugins/backend/skills/x/SKILL.md'],
    baseVersions: {},
    headVersions: {},
  });
  assert.deepEqual(result, []);
});

test('only paths that start with plugins/<name>/ count', () => {
  const result = pluginsNeedingBump({
    changedFiles: ['docs/plugins/frontend/a.md', 'plugins/README.md'],
    baseVersions: { frontend: '1.0.0', README: '1.0.0', 'README.md': '1.0.0' },
    headVersions: { frontend: '1.0.0', README: '1.0.0', 'README.md': '1.0.0' },
  });
  assert.deepEqual(result, []);
});

const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd, stdio: 'pipe' });

const writePlugin = (repo, name, version, extra = {}) => {
  const dir = join(repo, 'plugins', name, '.github', 'plugin');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'plugin.json'), JSON.stringify({ name, version }));
  for (const [file, text] of Object.entries(extra)) {
    const path = join(repo, 'plugins', name, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
};

const withRepo = (fn) => {
  const repo = mkdtempSync(join(tmpdir(), 'bump-'));
  try {
    git(repo, 'init', '-q', '-b', 'main');
    return fn(repo);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
};

const runCli = (repo, ref) => spawnSync('node', [script, ref], { cwd: repo, encoding: 'utf8' });

test('cli exits 1 and lists a changed plugin without a new version', () =>
  withRepo((repo) => {
    writePlugin(repo, 'frontend', '1.0.0', { 'skills/a/SKILL.md': 'one' });
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');
    git(repo, 'checkout', '-qb', 'feature');
    writeFileSync(join(repo, 'plugins/frontend/skills/a/SKILL.md'), 'two');
    git(repo, 'commit', '-qam', 'change');
    const result = runCli(repo, 'main');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /plugins\/frontend: endret uten ny versjon i plugin\.json/);
  }));

test('cli exits 0 when the version is bumped', () =>
  withRepo((repo) => {
    writePlugin(repo, 'frontend', '1.0.0', { 'skills/a/SKILL.md': 'one' });
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');
    git(repo, 'checkout', '-qb', 'feature');
    writeFileSync(join(repo, 'plugins/frontend/skills/a/SKILL.md'), 'two');
    writePlugin(repo, 'frontend', '1.0.1');
    git(repo, 'commit', '-qam', 'change');
    const result = runCli(repo, 'main');
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), 'OK');
  }));

test('cli exits 1 when a file in a plugin is deleted without a bump', () =>
  withRepo((repo) => {
    writePlugin(repo, 'workflow', '1.0.0', { 'agents/old.agent.md': 'x' });
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');
    git(repo, 'checkout', '-qb', 'feature');
    rmSync(join(repo, 'plugins/workflow/agents/old.agent.md'));
    git(repo, 'commit', '-qam', 'delete');
    const result = runCli(repo, 'main');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /plugins\/workflow: endret/);
  }));

test('cli exits 0 for a plugin that is new on the branch', () =>
  withRepo((repo) => {
    writeFileSync(join(repo, 'README.md'), 'x');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');
    git(repo, 'checkout', '-qb', 'feature');
    writePlugin(repo, 'backend', '1.0.0', { 'skills/a/SKILL.md': 'one' });
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'new plugin');
    assert.equal(runCli(repo, 'main').status, 0);
  }));

test('cli exits 0 when there is no plugins directory', () =>
  withRepo((repo) => {
    writeFileSync(join(repo, 'README.md'), 'x');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');
    git(repo, 'checkout', '-qb', 'feature');
    writeFileSync(join(repo, 'README.md'), 'y');
    git(repo, 'commit', '-qam', 'change');
    assert.equal(runCli(repo, 'main').status, 0);
  }));

test('cli exits 1 for the plugin a file was moved out of', () =>
  withRepo((repo) => {
    writePlugin(repo, 'frontend', '1.0.0', { 'skills/a/SKILL.md': 'one' });
    writePlugin(repo, 'workflow', '1.0.0');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');
    git(repo, 'checkout', '-qb', 'feature');
    mkdirSync(join(repo, 'plugins/workflow/skills/a'), { recursive: true });
    renameSync(join(repo, 'plugins/frontend/skills/a/SKILL.md'), join(repo, 'plugins/workflow/skills/a/SKILL.md'));
    writePlugin(repo, 'workflow', '1.0.1');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'move');
    const result = runCli(repo, 'main');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /plugins\/frontend: endret/);
  }));

test('cli exits 1 for a file with a non-ASCII name added without a bump', () =>
  withRepo((repo) => {
    writePlugin(repo, 'frontend', '1.0.0', { 'skills/a/SKILL.md': 'one' });
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');
    git(repo, 'checkout', '-qb', 'feature');
    writeFileSync(join(repo, 'plugins/frontend/skills/a/blå.md'), 'x');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'add');
    const result = runCli(repo, 'main');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /plugins\/frontend: endret/);
  }));

test('cli exits 1 and names the file when plugin.json at HEAD is not valid JSON', () =>
  withRepo((repo) => {
    writePlugin(repo, 'frontend', '1.0.0', { 'skills/a/SKILL.md': 'one' });
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');
    git(repo, 'checkout', '-qb', 'feature');
    writeFileSync(join(repo, 'plugins/frontend/skills/a/SKILL.md'), 'two');
    writeFileSync(join(repo, 'plugins/frontend/.github/plugin/plugin.json'), '{ nope');
    git(repo, 'commit', '-qam', 'change');
    const result = runCli(repo, 'main');
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /plugins\/frontend\/\.github\/plugin\/plugin\.json: er ikke gyldig JSON \(HEAD\)/,
    );
  }));

test('cli exits 1 and names the base ref when plugin.json on the base is not valid JSON', () =>
  withRepo((repo) => {
    writePlugin(repo, 'frontend', '1.0.0', { 'skills/a/SKILL.md': 'one' });
    writeFileSync(join(repo, 'plugins/frontend/.github/plugin/plugin.json'), '{ nope');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');
    git(repo, 'checkout', '-qb', 'feature');
    writeFileSync(join(repo, 'plugins/frontend/skills/a/SKILL.md'), 'two');
    writePlugin(repo, 'frontend', '1.0.1');
    git(repo, 'commit', '-qam', 'change');
    const result = runCli(repo, 'main');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /plugin\.json: er ikke gyldig JSON \(main\)/);
  }));

test('cli does not print OK when a plugin needs a bump', () =>
  withRepo((repo) => {
    writePlugin(repo, 'frontend', '1.0.0', { 'skills/a/SKILL.md': 'one' });
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');
    git(repo, 'checkout', '-qb', 'feature');
    writeFileSync(join(repo, 'plugins/frontend/skills/a/SKILL.md'), 'two');
    git(repo, 'commit', '-qam', 'change');
    assert.equal(runCli(repo, 'main').stdout, '');
  }));

test('cli exits non-zero and lets git explain when the base ref does not exist', () =>
  withRepo((repo) => {
    writeFileSync(join(repo, 'README.md'), 'x');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'base');
    const result = runCli(repo, 'finnes-ikke');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /fatal: .*finnes-ikke/);
  }));

test('cli prints usage and exits 2 without a base ref when started through a symlinked scripts directory', () => {
  const link = join(mkdtempSync(join(tmpdir(), 'bump-link-')), 'scripts');
  symlinkSync(dirname(script), link);
  const result = spawnSync('node', [join(link, 'check-version-bump.mjs')], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Bruk: node scripts\/check-version-bump\.mjs <baseRef>/);
});
