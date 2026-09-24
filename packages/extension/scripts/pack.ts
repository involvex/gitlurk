#!/usr/bin/env bun
/**
 * Build the extension and pack zip + CRX for GitHub Releases.
 * Usage: bun run --filter @gitlurk/extension pack
 *
 * CRX: bunx @involvex/ext-cli pack . --output gitlurk.crx
 * (from packages/extension; reuses key.pem when present)
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
const crxPath = join(root, 'gitlurk.crx');

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

console.log('Packing CRX with @involvex/ext-cli...');
rmSync(crxPath, { force: true });
await $`bunx @involvex/ext-cli pack . --output gitlurk.crx`.cwd(root);

if (!existsSync(crxPath)) {
  throw new Error('Missing gitlurk.crx after ext-cli pack');
}
console.log(`Packed ${crxPath}`);
