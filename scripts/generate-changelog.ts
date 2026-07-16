#!/usr/bin/env bun
/**
 * Generate CHANGELOG.md from git tags / commits.
 * Usage: bun run changelog
 */
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const repoUrl = 'https://github.com/involvex/gitlurk';

function git(args: string[]): string {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${result.stderr || result.stdout}`,
    );
  }
  return (result.stdout ?? '').trim();
}

const tags = git(['tag', '--list', 'v*', '--sort=-v:refname'])
  .split('\n')
  .filter(Boolean);

const lines: string[] = [
  '# Changelog',
  '',
  'All notable changes to GitLurk Desktop.',
  '',
];

function commitsBetween(from: string | null, to: string): string[] {
  const range = from ? `${from}..${to}` : to;
  const log = git(['log', range, '--pretty=format:%h%x09%s', '--no-merges']);
  if (!log) return [];
  return log.split('\n').map((line) => {
    const [hash, ...rest] = line.split('\t');
    const subject = rest.join('\t');
    return `- ${subject} ([${hash}](${repoUrl}/commit/${hash}))`;
  });
}

if (tags.length === 0) {
  const date = new Date().toISOString().slice(0, 10);
  lines.push(`## [Unreleased] - ${date}`, '');
  const commits = commitsBetween(null, 'HEAD');
  lines.push(...(commits.length ? commits : ['- Initial project setup']), '');
} else {
  const unreleased = commitsBetween(tags[0], 'HEAD');
  if (unreleased.length) {
    lines.push('## [Unreleased]', '', ...unreleased, '');
  }

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const prev = tags[i + 1] ?? null;
    const date = git(['log', '-1', '--format=%cs', tag]);
    lines.push(`## [${tag}](${repoUrl}/releases/tag/${tag}) - ${date}`, '');
    const commits = commitsBetween(prev, tag);
    lines.push(...(commits.length ? commits : ['- Release']), '');
  }
}

writeFileSync('CHANGELOG.md', `${lines.join('\n')}\n`);
console.log('Wrote CHANGELOG.md');
