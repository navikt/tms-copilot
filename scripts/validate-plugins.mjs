import fs, { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_DESCRIPTION_LENGTH = 1024;

export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const result = {};
  let inDescription = false;
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^(name|description):[ \t]*(.*?)[ \t]*$/);
    if (field) result[field[1]] = field[2];
    if (inDescription && /^[ \t]+\S/.test(line)) result.descriptionContinues = true;
    inDescription = field?.[1] === 'description';
  }
  return result;
}

function isObject(value) {
  return typeof value === 'object' && value !== null;
}

function readJson(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    return { error: error.code === 'ENOENT' ? 'mangler' : 'kan ikke leses' };
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return { error: 'er ikke gyldig JSON' };
  }
  return isObject(value) && !Array.isArray(value)
    ? { value }
    : { error: 'må være et JSON-objekt' };
}

function isDirectory(dir) {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

function validateSkill(skillFile, dirName, errors) {
  if (!fs.existsSync(skillFile)) {
    errors.push(`${skillFile}: mangler SKILL.md`);
    return;
  }
  let text;
  try {
    text = fs.readFileSync(skillFile, 'utf8');
  } catch {
    errors.push(`${skillFile}: kan ikke leses`);
    return;
  }
  const frontmatter = parseFrontmatter(text);
  if (!frontmatter) {
    errors.push(`${skillFile}: mangler frontmatter`);
    return;
  }
  if (frontmatter.name !== dirName) {
    errors.push(`${skillFile}: name "${frontmatter.name}" må være lik mappenavnet "${dirName}"`);
  }
  const raw = frontmatter.description ?? '';
  if (/^[>|]/.test(raw) || frontmatter.descriptionContinues) {
    errors.push(`${skillFile}: use a single-line description`);
    return;
  }
  const description = raw.replace(/^"(.*)"$/, '$1');
  if (description === '') {
    errors.push(`${skillFile}: description er tom`);
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `${skillFile}: description er ${description.length} tegn, maks ${MAX_DESCRIPTION_LENGTH}`,
    );
  }
}

function validatePlugin(rootDir, entry, errors) {
  const pluginRoot = path.resolve(rootDir, entry.source);
  const manifestFile = path.join(pluginRoot, '.github/plugin/plugin.json');
  const manifest = readJson(manifestFile);
  if (manifest.error) {
    errors.push(`${manifestFile}: ${manifest.error}`);
    return;
  }
  const { name, version, skills } = manifest.value;
  if (name !== entry.name) {
    errors.push(`${manifestFile}: name "${name}" må være lik "${entry.name}" i marketplace.json`);
  }
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    errors.push(`${manifestFile}: version "${version}" må være på formen 1.2.3`);
  }
  if (skills !== undefined && typeof skills !== 'string') {
    errors.push(`${manifestFile}: skills må være en tekststi`);
    return;
  }
  const skillsDir = path.resolve(pluginRoot, skills ?? 'skills');
  if (!isDirectory(skillsDir)) {
    if (skills === undefined) return;
    errors.push(`${manifestFile}: skills-mappen ${skills} finnes ikke`);
    return;
  }
  for (const dirent of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      validateSkill(path.join(skillsDir, dirent.name, 'SKILL.md'), dirent.name, errors);
    }
  }
}

export function validateMarketplace(rootDir) {
  const errors = [];
  const marketplaceFile = path.join(rootDir, '.github/plugin/marketplace.json');
  const marketplace = readJson(marketplaceFile);
  if (marketplace.error) return [`${marketplaceFile}: ${marketplace.error}`];
  const { name, plugins } = marketplace.value;
  if (name !== 'min-side') {
    errors.push(`${marketplaceFile}: name må være "min-side", fant "${name}"`);
  }
  if (!Array.isArray(plugins) || plugins.length === 0) {
    errors.push(`${marketplaceFile}: plugins må være en liste med minst én plugin`);
    return errors;
  }
  for (const entry of plugins) {
    if (!isObject(entry) || !entry.name || typeof entry.source !== 'string' || path.isAbsolute(entry.source)) {
      errors.push(`${marketplaceFile}: plugin-oppføring trenger name og relativ source`);
      continue;
    }
    validatePlugin(rootDir, entry, errors);
  }
  return errors;
}

if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = validateMarketplace(process.argv[2] ?? '.');
  if (errors.length > 0) {
    console.log(errors.join('\n'));
    process.exit(1);
  }
  console.log('OK');
}
