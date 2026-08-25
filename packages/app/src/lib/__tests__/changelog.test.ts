import { describe, expect, test } from 'bun:test';
import { latestChangelogSection, parseChangelogSections } from '../changelog';

const SAMPLE = `# Changelog

All notable changes.

## [v0.2.0](https://example.com/releases/tag/v0.2.0) - 2026-08-01

- feat(app): add stash apply ([abc1234](https://example.com/commit/abc1234))
- fix(app): persist notification sound

## [v0.1.0](https://example.com/releases/tag/v0.1.0) - 2026-01-01

- initial release
`;

describe('parseChangelogSections', () => {
  test('parses sections in order with version, url, and entries', () => {
    const sections = parseChangelogSections(SAMPLE);
    expect(sections).toHaveLength(2);

    expect(sections[0].version).toBe('v0.2.0');
    expect(sections[0].url).toBe('https://example.com/releases/tag/v0.2.0');
    expect(sections[0].entries).toHaveLength(2);
    expect(sections[0].entries[0]).toContain('add stash apply');

    expect(sections[1].version).toBe('v0.1.0');
    expect(sections[1].entries).toEqual(['initial release']);
  });

  test('handles headings without links', () => {
    const sections = parseChangelogSections('## Unreleased\n- some change\n');
    expect(sections[0].version).toBe('Unreleased');
    expect(sections[0].url).toBeNull();
    expect(sections[0].entries).toEqual(['some change']);
  });

  test('ignores list items outside of any section and non-list lines', () => {
    const sections = parseChangelogSections(
      '- orphan entry\n## v1.0.0\ntext line\n- real entry\n',
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].entries).toEqual(['real entry']);
  });

  test('returns empty array for changelog without sections', () => {
    expect(parseChangelogSections('# Changelog\n\nnothing here')).toEqual([]);
  });
});

describe('latestChangelogSection', () => {
  test('returns the first section', () => {
    const latest = latestChangelogSection(SAMPLE);
    expect(latest?.version).toBe('v0.2.0');
  });

  test('returns null when there are no sections', () => {
    expect(latestChangelogSection('# Changelog')).toBeNull();
  });
});
