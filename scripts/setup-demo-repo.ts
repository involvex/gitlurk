import { $ } from 'bun';
import { join, dirname } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

const DEMO_DIR = join(import.meta.dir, 'demo-repo');

function w(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

let step = 0;
async function run(cmd: string) {
  step++;
  process.stdout.write(`  [${step}] ${cmd.substring(0, 60)}...`);
  const result = await $`${{ raw: cmd }}`.cwd(DEMO_DIR).nothrow();
  if (result.exitCode !== 0) {
    console.log(` WARN (${result.exitCode})`);
  } else {
    console.log(' OK');
  }
}

async function main() {
  console.log('Setting up demo repo...');
  mkdirSync(DEMO_DIR, { recursive: true });

  await run('git init');
  await run('git config user.name "Demo User"');
  await run('git config user.email "demo@gitlurk.dev"');

  console.log('Creating project files...');
  w(
    join(DEMO_DIR, 'package.json'),
    '{"name":"demo-project","version":"1.0.0","type":"module"}',
  );
  w(
    join(DEMO_DIR, 'src/index.ts'),
    'export function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n',
  );
  w(
    join(DEMO_DIR, 'src/utils.ts'),
    'export function formatDate(date: Date): string {\n  return date.toISOString().split("T")[0];\n}\n',
  );
  w(
    join(DEMO_DIR, 'README.md'),
    '# Demo Project\nA demo repository for screenshots.',
  );
  w(join(DEMO_DIR, '.gitignore'), 'node_modules/\ndist/\n.env\n');
  w(
    join(DEMO_DIR, 'tsconfig.json'),
    '{"compilerOptions":{"target":"ES2022","module":"ESNext","strict":true,"outDir":"dist"},"include":["src"]}',
  );
  w(
    join(DEMO_DIR, 'src/config.ts'),
    'export const config = {\n  appName: "DemoApp",\n  port: 3000,\n  debug: true,\n};\n',
  );

  console.log('Creating commits...');
  await run('git add -A && git commit -m "feat: initial project setup"');

  w(
    join(DEMO_DIR, 'src/auth.ts'),
    'export function login(user: string, pass: string): boolean {\n  return user.length > 0 && pass.length >= 8;\n}\n',
  );
  w(
    join(DEMO_DIR, 'src/database.ts'),
    'import { config } from "./config.js";\n\nexport function connect(): string {\n  return `Connected to port ${config.port}`;\n}\n',
  );
  await run(
    'git add -A && git commit -m "feat: add auth and database modules"',
  );

  w(
    join(DEMO_DIR, 'README.md'),
    '# Demo Project\n\nA demo repository for GitLurk Desktop screenshots.\n\n## Features\n- TypeScript support\n- Authentication\n- Database integration\n',
  );
  await run('git add README.md && git commit -m "docs: expand README"');

  w(
    join(DEMO_DIR, 'src/utils.ts'),
    'export function formatDate(date: Date): string {\n  return date.toISOString().split("T")[0];\n}\n\nexport function slugify(text: string): string {\n  return text.toLowerCase().replace(/\\s+/g, "-");\n}\n',
  );
  await run(
    'git add src/utils.ts && git commit -m "feat(utils): add slugify helper"',
  );

  console.log('Creating branches...');
  await run('git checkout -b feature/auth-improvements');
  w(
    join(DEMO_DIR, 'src/auth.ts'),
    'export function login(user: string, pass: string): boolean {\n  if (!user || !pass) return false;\n  if (pass.length < 8) return false;\n  return true;\n}\n\nexport function logout(): void {\n  console.log("Logged out");\n}\n',
  );
  await run(
    'git add src/auth.ts && git commit -m "feat(auth): add validation and logout"',
  );

  await run('git checkout -b feature/api-endpoint main');
  w(
    join(DEMO_DIR, 'src/api.ts'),
    'export interface ApiResponse<T> {\n  data: T;\n  status: number;\n}\n\nexport async function fetchUsers() {\n  const res = await fetch("/api/users");\n  return res.json() as Promise<ApiResponse<unknown>>;\n}\n',
  );
  await run(
    'git add src/api.ts && git commit -m "feat(api): add typed API client"',
  );

  await run('git checkout -b bugfix/login-error feature/auth-improvements');
  w(
    join(DEMO_DIR, 'src/auth.ts'),
    'export function login(user: string, pass: string): boolean {\n  if (!user || !pass) throw new Error("Missing credentials");\n  if (pass.length < 8) return false;\n  return true;\n}\n\nexport function logout(): void {\n  console.log("Logged out");\n}\n',
  );
  await run(
    'git add src/auth.ts && git commit -m "fix(auth): throw on empty credentials"',
  );

  console.log('Creating working directory changes...');
  await run('git checkout main');

  // Staged change
  w(
    join(DEMO_DIR, 'src/index.ts'),
    'export function greet(name: string): string {\n  return `Hello, ${name}! Welcome to GitLurk.`;\n}\n\nexport function farewell(name: string): string {\n  return `Goodbye, ${name}!`;\n}\n',
  );
  await run('git add src/index.ts');

  // Unstaged change
  w(
    join(DEMO_DIR, 'src/config.ts'),
    'export const config = {\n  appName: "DemoApp",\n  port: 8080,\n  debug: false,\n  environment: "production",\n};\n',
  );

  // Untracked file
  w(
    join(DEMO_DIR, 'src/logger.ts'),
    'export enum LogLevel {\n  Debug,\n  Info,\n  Warn,\n  Error,\n}\n\nexport function log(level: LogLevel, msg: string): void {\n  console.log(`[${LogLevel[level]}] ${msg}`);\n}\n',
  );

  console.log('Creating stashes...');
  await run('git stash push -m "WIP: logger module draft"');

  w(
    join(DEMO_DIR, 'src/validator.ts'),
    'export function validateEmail(email: string): boolean {\n  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);\n}\n',
  );
  await run('git stash push -m "WIP: email validator"');
  await run('git stash pop stash@{0}');

  console.log('\nDone!');
  console.log(
    (
      await $`git --no-pager log --oneline --graph --all`.cwd(DEMO_DIR)
    ).stdout.toString(),
  );
  console.log(
    (await $`git --no-pager status --short`.cwd(DEMO_DIR)).stdout.toString(),
  );
  console.log(
    (await $`git --no-pager stash list`.cwd(DEMO_DIR)).stdout.toString(),
  );
}

main().catch(console.error);
