#!/usr/bin/env bun
/**
 * Build the extension and pack a loadable zip for GitHub Releases.
 * Usage: bun run packages/extension/scripts/pack.ts
 */
import { mkdirSync, readFileSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

const root = join(import.meta.dir, '..');
const distDir = join(root, 'dist');
const stagingDir = join(root, '.pack');
const manifest = JSON.parse(
  readFileSync(join(root, 'manifest.json'), 'utf8'),
) as { version: string };
const version = manifest.version;
const zipName = `gitlurk-extension-${version}.zip`;
const zipPath = join(root, zipName);

console.log(`Building @gitlurk/extension v${version}...`);
await $`bun run build`.cwd(root);

if (!existsSync(join(distDir, 'content-script.js'))) {
  throw new Error('Missing dist/content-script.js after build');
}

rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });
cpSync(join(root, 'manifest.json'), join(stagingDir, 'manifest.json'));
cpSync(distDir, join(stagingDir, 'dist'), { recursive: true });
cpSync(join(root, 'icons'), join(stagingDir, 'icons'), { recursive: true });

rmSync(zipPath, { force: true });

await $`powershell -NoProfile -Command Compress-Archive -Path '${join(stagingDir, '*')}' -DestinationPath '${zipPath}' -Force`;

rmSync(stagingDir, { recursive: true, force: true });
console.log(`Packed ${zipPath}`);
