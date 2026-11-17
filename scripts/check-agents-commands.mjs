import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMAND = /\b(?:pnpm|npm) run ([A-Za-z0-9_](?:[A-Za-z0-9:_-]*[A-Za-z0-9_])?)/g;

export function findMissingScripts(agentsMd, scripts) {
  const missing = [];
  agentsMd.split('\n').forEach((text, index) => {
    for (const match of text.matchAll(COMMAND)) {
      if (!Object.hasOwn(scripts, match[1])) {
        missing.push({ line: index + 1, command: match[0], script: match[1] });
      }
    }
  });
  return missing;
}

function main(repoDir) {
  const agentsPath = join(repoDir, 'AGENTS.md');
  const packagePath = join(repoDir, 'package.json');
  if (!existsSync(agentsPath)) {
    console.log('Ingen AGENTS.md, hopper over');
    return 0;
  }
  if (!existsSync(packagePath)) {
    console.log('Ingen package.json, hopper over');
    return 0;
  }
  const scripts = JSON.parse(readFileSync(packagePath, 'utf8')).scripts ?? {};
  const missing = findMissingScripts(readFileSync(agentsPath, 'utf8'), scripts);
  for (const { line, command } of missing) {
    console.log(`AGENTS.md:${line}: "${command}" finnes ikke som script i package.json`);
  }
  if (missing.length > 0) return 1;
  console.log('OK');
  return 0;
}

if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv[2] ?? '.'));
}
