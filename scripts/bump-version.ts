#!/usr/bin/env bun
/**
 * Bump patch version across monorepo package.json files, tauri.conf.json, Cargo.toml.
 * Usage: bun run scripts/bump-version.ts [patch|minor|major]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const kind = (process.argv[2] ?? 'patch') as 'patch' | 'minor' | 'major';

function bump(version: string): string {
  const [maj, min, pat] = version.split('.').map((n) => Number(n));
  if ([maj, min, pat].some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid version: ${version}`);
  }
  if (kind === 'major') return `${maj + 1}.0.0`;
  if (kind === 'minor') return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

const tauriPath = 'packages/app/src-tauri/tauri.conf.json';
const tauri = JSON.parse(readFileSync(tauriPath, 'utf8')) as {
  version: string;
};
const next = bump(String(tauri.version));

const packageFiles = [
  'package.json',
  'packages/app/package.json',
  'packages/shared/package.json',
  'packages/cli/package.json',
  'packages/git/package.json',
  'packages/plugin-sdk/package.json',
  'packages/extension/package.json',
  'packages/plugins/example-hello/package.json',
];

for (const file of packageFiles) {
  const json = JSON.parse(readFileSync(file, 'utf8')) as {
    version?: string;
  };
  json.version = next;
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`${file} -> ${next}`);
}

tauri.version = next;
writeFileSync(tauriPath, `${JSON.stringify(tauri, null, 2)}\n`);
console.log(`${tauriPath} -> ${next}`);

const cargoPath = 'packages/app/src-tauri/Cargo.toml';
const cargo = readFileSync(cargoPath, 'utf8');
const updated = cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${next}"`);
if (updated === cargo) {
  throw new Error(`Could not update version in ${cargoPath}`);
}
writeFileSync(cargoPath, updated);
console.log(`${cargoPath} -> ${next}`);

console.log(`v${next}`);
