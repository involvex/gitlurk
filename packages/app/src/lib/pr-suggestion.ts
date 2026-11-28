/**
 * Helpers for GitHub PR "suggested changes" comment bodies.
 * https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/commenting-on-a-pull-request#adding-a-comment-to-a-pull-request-diff
 */

/** Wrap one or more lines in a GitHub ```suggestion fence. */
export function wrapSuggestion(lines: string): string {
  const normalized = lines.replace(/\r\n/g, '\n').replace(/\n$/, '');
  return '```suggestion\n' + normalized + '\n```';
}

/**
 * If `body` already contains a suggestion fence, return it unchanged.
 * Otherwise prepend a suggestion block seeded with `seedLine`.
 */
export function insertSuggestion(body: string, seedLine: string): string {
  if (/```suggestion\b/.test(body)) {
    return body;
  }
  const suggestion = wrapSuggestion(seedLine);
  const trimmed = body.trim();
  return trimmed ? `${trimmed}\n\n${suggestion}` : suggestion;
}

/**
 * Read the text of a single line from a unified patch (hunk-only or full
 * `diff --git` form) by file line number and side.
 * LEFT = old file (`-` / context); RIGHT = new file (`+` / context).
 */
export function extractPatchLine(
  patch: string,
  line: number,
  side: 'LEFT' | 'RIGHT',
): string | null {
  if (!Number.isFinite(line) || line < 1) return null;

  let oldLine = 0;
  let newLine = 0;
  let inHunk = false;

  for (const raw of patch.replace(/\r\n/g, '\n').split('\n')) {
    if (raw.startsWith('@@')) {
      const match = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s*@@/.exec(raw);
      if (!match) {
        inHunk = false;
        continue;
      }
      oldLine = Number(match[1]);
      newLine = Number(match[2]);
      inHunk = true;
      continue;
    }
    if (!inHunk) continue;
    if (raw.startsWith('\\')) continue; // "\ No newline at end of file"

    const prefix = raw[0];
    const content = raw.length > 0 ? raw.slice(1) : '';

    if (prefix === ' ' || prefix === undefined) {
      if (side === 'LEFT' && oldLine === line) return content;
      if (side === 'RIGHT' && newLine === line) return content;
      oldLine += 1;
      newLine += 1;
      continue;
    }
    if (prefix === '-') {
      if (side === 'LEFT' && oldLine === line) return content;
      oldLine += 1;
      continue;
    }
    if (prefix === '+') {
      if (side === 'RIGHT' && newLine === line) return content;
      newLine += 1;
      continue;
    }
  }

  return null;
}
