import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pluginOf = (file) => /^plugins\/([^/]+)\//.exec(file)?.[1];

export function pluginsNeedingBump({ changedFiles, baseVersions, headVersions }) {
  const changed = new Set(changedFiles.map(pluginOf).filter(Boolean));
  return [...changed].filter(
    (name) => baseVersions[name] !== undefined && baseVersions[name] === headVersions[name],
  );
}

const git = (...args) =>
  execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

const existsAt = (ref, file) => {
  try {
    execFileSync('git', ['cat-file', '-e', `${ref}:${file}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const manifestPath = (name) => `plugins/${name}/.github/plugin/plugin.json`;

const versionAt = (ref, name, invalid) => {
  const file = manifestPath(name);
  if (!existsAt(ref, file)) return undefined;
  try {
    return JSON.parse(git('show', `${ref}:${file}`))?.version;
  } catch {
    invalid.push(`${file}: er ikke gyldig JSON (${ref})`);
    return undefined;
  }
};

function main(baseRef) {
  const changedFiles = git('diff', '--name-only', '--no-renames', `${baseRef}...HEAD`).split('\n').filter(Boolean);
  const names = new Set(changedFiles.map(pluginOf).filter(Boolean));
  const baseVersions = {};
  const headVersions = {};
  const invalid = [];
  for (const name of names) {
    baseVersions[name] = versionAt(baseRef, name, invalid);
    headVersions[name] = versionAt('HEAD', name, invalid);
  }
  const failing = pluginsNeedingBump({ changedFiles, baseVersions, headVersions });
  for (const message of invalid) console.error(message);
  for (const name of failing) {
    console.error(`plugins/${name}: endret uten ny versjon i plugin.json`);
  }
  process.exitCode = invalid.length + failing.length > 0 ? 1 : 0;
  if (process.exitCode === 0) console.log('OK');
}

if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const baseRef = process.argv[2];
  if (!baseRef) {
    console.error('Bruk: node scripts/check-version-bump.mjs <baseRef>');
    process.exitCode = 2;
  } else {
    main(baseRef);
  }
}
