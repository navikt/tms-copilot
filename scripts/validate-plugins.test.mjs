import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, validateMarketplace } from './validate-plugins.mjs';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'validate-plugins.mjs');

function write(root, file, content) {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function skillFile(name, description) {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`;
}

function buildTree({ marketplaceName = 'min-side', plugins } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-plugins-'));
  const defaults = [
    { name: 'frontend', skills: { astro: skillFile('astro', 'Astro help.') } },
    { name: 'workflow', skills: { grill: skillFile('grill', 'Grilling.') } },
    { name: 'backend' },
  ];
  const list = plugins ?? defaults;
  write(
    root,
    '.github/plugin/marketplace.json',
    JSON.stringify({
      name: marketplaceName,
      plugins: list.map((p) => ({ name: p.name, source: `./plugins/${p.name}` })),
    }),
  );
  for (const p of list) {
    const manifest = { name: p.manifestName ?? p.name, version: p.version ?? '1.0.0' };
    if (p.skills) manifest.skills = 'skills';
    write(root, `plugins/${p.name}/.github/plugin/plugin.json`, JSON.stringify(manifest));
    for (const [dir, content] of Object.entries(p.skills ?? {})) {
      write(root, `plugins/${p.name}/skills/${dir}/SKILL.md`, content);
    }
  }
  return root;
}

function withSkill(dir, content) {
  return buildTree({ plugins: [{ name: 'frontend', skills: { [dir]: content } }] });
}

test('valid three-plugin marketplace returns no errors', () => {
  assert.deepEqual(validateMarketplace(buildTree()), []);
});

test('wrong marketplace name is an error', () => {
  const errors = validateMarketplace(buildTree({ marketplaceName: 'other' }));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /marketplace\.json/);
  assert.match(errors[0], /min-side/);
});

test('missing marketplace.json is an error', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-plugins-'));
  const errors = validateMarketplace(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /marketplace\.json/);
});

test('empty plugins array is an error', () => {
  const errors = validateMarketplace(buildTree({ plugins: [] }));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /plugins/);
});

test('missing plugin.json is an error', () => {
  const root = buildTree();
  fs.rmSync(path.join(root, 'plugins/backend/.github/plugin/plugin.json'));
  const errors = validateMarketplace(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /plugins\/backend\/\.github\/plugin\/plugin\.json/);
});

test('plugin name mismatch is an error', () => {
  const errors = validateMarketplace(
    buildTree({ plugins: [{ name: 'backend', manifestName: 'bakend' }] }),
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /plugin\.json/);
  assert.match(errors[0], /bakend/);
});

test('non-semver version is an error', () => {
  const errors = validateMarketplace(buildTree({ plugins: [{ name: 'backend', version: '1.0' }] }));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /version/);
});

test('skill name differing from its directory is an error', () => {
  const errors = validateMarketplace(withSkill('astro', skillFile('astr0', 'Fine.')));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /skills\/astro\/SKILL\.md/);
  assert.match(errors[0], /name/);
});

test('skill directory without SKILL.md is an error', () => {
  const root = withSkill('astro', skillFile('astro', 'Fine.'));
  fs.rmSync(path.join(root, 'plugins/frontend/skills/astro/SKILL.md'));
  const errors = validateMarketplace(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /skills\/astro\/SKILL\.md/);
});

test('empty description is an error', () => {
  const errors = validateMarketplace(withSkill('astro', '---\nname: astro\ndescription:\n---\n'));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /description/);
});

test('description of 1024 chars passes and 1025 fails', () => {
  assert.deepEqual(
    validateMarketplace(withSkill('astro', skillFile('astro', 'a'.repeat(1024)))),
    [],
  );
  const errors = validateMarketplace(withSkill('astro', skillFile('astro', 'a'.repeat(1025))));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /1024/);
});

test('quoted description is measured without quotes', () => {
  assert.deepEqual(
    validateMarketplace(withSkill('astro', skillFile('astro', `"${'a'.repeat(1024)}"`))),
    [],
  );
  assert.equal(
    validateMarketplace(withSkill('astro', skillFile('astro', `"${'a'.repeat(1025)}"`))).length,
    1,
  );
});

test('block scalar description is an error', () => {
  for (const marker of ['>', '|', '>-', '|+']) {
    const content = `---\nname: astro\ndescription: ${marker}\n  Some text\n---\n`;
    const errors = validateMarketplace(withSkill('astro', content));
    assert.equal(errors.length, 1, marker);
    assert.match(errors[0], /use a single-line description/);
  }
});

test('CRLF frontmatter parses', () => {
  const content = '---\r\nname: astro\r\ndescription: Astro help.\r\n---\r\n\r\n# Astro\r\n';
  assert.deepEqual(parseFrontmatter(content), { name: 'astro', description: 'Astro help.' });
  assert.deepEqual(validateMarketplace(withSkill('astro', content)), []);
});

test('parseFrontmatter returns null without a frontmatter block', () => {
  assert.equal(parseFrontmatter('# Astro\n'), null);
  assert.equal(parseFrontmatter('\n---\nname: x\n---\n'), null);
});

test('skill without frontmatter is an error', () => {
  const errors = validateMarketplace(withSkill('astro', '# Astro\n'));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /frontmatter/);
});

test('CLI prints OK and exits 0 for a valid tree', () => {
  const result = spawnSync('node', [script, buildTree()], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'OK');
});

test('CLI prints one error per line and exits 1 for an invalid tree', () => {
  const root = buildTree({ marketplaceName: 'other' });
  const result = spawnSync('node', [script, root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout.trim().split('\n').length, 1);
  assert.match(result.stdout, /min-side/);
});

test('version with a prefix or suffix is an error', () => {
  for (const version of ['v1.0.0', '1.0.0-beta']) {
    const errors = validateMarketplace(buildTree({ plugins: [{ name: 'backend', version }] }));
    assert.equal(errors.length, 1, version);
  }
});

test('skill without a description line is an error', () => {
  const errors = validateMarketplace(withSkill('astro', '---\nname: astro\n---\n'));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /description/);
});

test('plugin entry with an absolute source or no name is an error', () => {
  const root = buildTree();
  const file = path.join(root, '.github/plugin/marketplace.json');
  const marketplace = JSON.parse(fs.readFileSync(file, 'utf8'));
  marketplace.plugins = [
    { name: 'backend', source: path.join(root, 'plugins/backend') },
    { source: './plugins/frontend' },
  ];
  fs.writeFileSync(file, JSON.stringify(marketplace));
  const errors = validateMarketplace(root);
  assert.equal(errors.length, 2);
  for (const error of errors) assert.match(error, /name og relativ source/);
});

test('CLI validates the current directory when given no argument', () => {
  const result = spawnSync('node', [script], { cwd: buildTree(), encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'OK');
});

const marketplacePath = '.github/plugin/marketplace.json';
const backendManifest = 'plugins/backend/.github/plugin/plugin.json';

function validateWith(file, content) {
  const root = buildTree();
  fs.writeFileSync(path.join(root, file), content);
  return validateMarketplace(root);
}

test('invalid JSON in marketplace.json is an error', () => {
  const errors = validateWith(marketplacePath, '{ nope');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /marketplace\.json: er ikke gyldig JSON/);
});

test('invalid JSON in plugin.json is an error', () => {
  const errors = validateWith(backendManifest, '{ nope');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /plugins\/backend\/.*plugin\.json: er ikke gyldig JSON/);
});

test('missing marketplace.json says mangler, not invalid JSON', () => {
  const errors = validateMarketplace(fs.mkdtempSync(path.join(os.tmpdir(), 'validate-plugins-')));
  assert.match(errors[0], /marketplace\.json: mangler$/);
});

test('missing plugin.json says mangler', () => {
  const root = buildTree();
  fs.rmSync(path.join(root, backendManifest));
  assert.match(validateMarketplace(root)[0], /plugin\.json: mangler$/);
});

test('skills path that does not exist is an error', () => {
  const root = buildTree();
  fs.rmSync(path.join(root, 'plugins/frontend/skills'), { recursive: true });
  const errors = validateMarketplace(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /plugins\/frontend\/.*plugin\.json: skills-mappen skills finnes ikke/);
});

test('null marketplace.json is an error and does not throw', () => {
  const errors = validateWith(marketplacePath, 'null');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /marketplace\.json: må være et JSON-objekt/);
});

test('null plugin.json is an error and does not throw', () => {
  const errors = validateWith(backendManifest, 'null');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /plugin\.json: må være et JSON-objekt/);
});

test('null entry in plugins is an error and does not throw', () => {
  const root = buildTree();
  const file = path.join(root, marketplacePath);
  fs.writeFileSync(file, JSON.stringify({ name: 'min-side', plugins: [null] }));
  const errors = validateMarketplace(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /marketplace\.json: plugin-oppføring/);
});

test('non-string skills is an error and does not throw', () => {
  const errors = validateWith(backendManifest, JSON.stringify({ name: 'backend', version: '1.0.0', skills: 123 }));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /plugin\.json: skills må være en tekststi/);
});

test('skills pointing at a file is an error and does not throw', () => {
  const root = buildTree();
  write(root, 'plugins/backend/skills', 'not a directory');
  fs.writeFileSync(
    path.join(root, backendManifest),
    JSON.stringify({ name: 'backend', version: '1.0.0', skills: 'skills' }),
  );
  const errors = validateMarketplace(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /plugin\.json: skills-mappen skills finnes ikke/);
});

test('SKILL.md that is a directory is an error and does not throw', () => {
  const root = withSkill('astro', skillFile('astro', 'Fine.'));
  const skillMd = path.join(root, 'plugins/frontend/skills/astro/SKILL.md');
  fs.rmSync(skillMd);
  fs.mkdirSync(skillMd);
  const errors = validateMarketplace(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /skills\/astro\/SKILL\.md: kan ikke leses/);
});

test('array as plugin.json root is an error', () => {
  assert.match(validateWith(backendManifest, '[]')[0], /plugin\.json: må være et JSON-objekt/);
});

test('plugin.json that is a directory says kan ikke leses', () => {
  const root = buildTree();
  const manifest = path.join(root, backendManifest);
  fs.rmSync(manifest);
  fs.mkdirSync(manifest);
  const errors = validateMarketplace(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /plugin\.json: kan ikke leses/);
});

function dropSkillsKey(root, plugin) {
  const file = path.join(root, `plugins/${plugin}/.github/plugin/plugin.json`);
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  delete manifest.skills;
  fs.writeFileSync(file, JSON.stringify(manifest));
}

test('plugin without a skills key has its skills/ directory validated', () => {
  const root = withSkill('kotlin', skillFile('kotlinn', 'a'.repeat(1100)));
  dropSkillsKey(root, 'frontend');
  const errors = validateMarketplace(root);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /skills\/kotlin\/SKILL\.md: name "kotlinn"/);
  assert.match(errors[1], /skills\/kotlin\/SKILL\.md: description er 1100 tegn/);
});

test('plugin without a skills key and without a skills/ directory is valid', () => {
  const root = buildTree({ plugins: [{ name: 'backend' }] });
  assert.equal(fs.existsSync(path.join(root, 'plugins/backend/skills')), false);
  assert.deepEqual(validateMarketplace(root), []);
});

test('multi-line plain description is an error', () => {
  const content = `---\nname: astro\ndescription: ${'a'.repeat(900)}\n  ${'b'.repeat(900)}\n---\n`;
  const errors = validateMarketplace(withSkill('astro', content));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /use a single-line description/);
});

test('description that starts on the line after the key is an error', () => {
  const content = '---\nname: astro\ndescription:\n  Some text\n---\n';
  const errors = validateMarketplace(withSkill('astro', content));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /use a single-line description/);
});

test('an indented line after another field does not count as a description continuation', () => {
  const content = '---\ndescription: Fine.\nname: astro\n  extra\n---\n';
  assert.deepEqual(validateMarketplace(withSkill('astro', content)), []);
});

test('CLI fails on an invalid tree when started through a symlinked scripts directory', () => {
  const link = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'validate-plugins-link-')), 'scripts');
  fs.symlinkSync(path.dirname(script), link);
  const root = buildTree({ marketplaceName: 'other' });
  const result = spawnSync('node', [path.join(link, 'validate-plugins.mjs'), root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /min-side/);
});

test('a whitespace-only line after the description is not a continuation', () => {
  const content = '---\nname: astro\ndescription: Fine.\n   \n---\n';
  assert.deepEqual(validateMarketplace(withSkill('astro', content)), []);
});

test('indented lines under another key after the description are not a continuation', () => {
  const content = '---\nname: astro\ndescription: Fine.\nmetadata:\n  author: team\n---\n';
  assert.deepEqual(validateMarketplace(withSkill('astro', content)), []);
});
