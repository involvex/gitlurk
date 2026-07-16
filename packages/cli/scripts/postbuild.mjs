import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'dist', 'index.js');
let text = readFileSync(file, 'utf8');
text = text.replace(/^#!.*\r?\n/gm, '');
writeFileSync(file, `#!/usr/bin/env node\n${text}`);
console.log('Shebang prepended to dist/index.js');
