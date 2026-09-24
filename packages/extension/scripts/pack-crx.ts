#!/usr/bin/env bun
/**
 * Build the extension JS, then pack a CRX via @involvex/ext-cli.
 * Usage: bun run --filter @gitlurk/extension pack:crx
 */
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

const root = join(import.meta.dir, '..');
const crxPath = join(root, 'gitlurk.crx');

console.log('Building extension...');
await $`bun run build`.cwd(root);

if (!existsSync(join(root, 'dist', 'content-script.js'))) {
  throw new Error('Missing dist/content-script.js after build');
}

console.log(
  'Packing CRX (bunx @involvex/ext-cli pack . --output gitlurk.crx)...',
);
rmSync(crxPath, { force: true });
await $`bunx @involvex/ext-cli pack . --output gitlurk.crx`.cwd(root);

if (!existsSync(crxPath)) {
  throw new Error('Missing gitlurk.crx after ext-cli pack');
}
console.log(`Packed ${crxPath}`);
