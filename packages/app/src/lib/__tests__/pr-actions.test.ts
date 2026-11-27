import { describe, expect, test } from 'bun:test';
import {
  formatPullActionError,
  getPullMergeGate,
  mergeMethodLabel,
} from '../pr-actions';

describe('getPullMergeGate', () => {
  test('blocks closed pull requests', () => {
    expect(
      getPullMergeGate({
        state: 'closed',
        draft: false,
        mergeable: true,
      }),
    ).toEqual({
      canMerge: false,
      label: 'Closed',
      reason: 'Only open pull requests can be merged',
    });
  });

  test('blocks drafts', () => {
    const gate = getPullMergeGate({
      state: 'open',
      draft: true,
      mergeable: true,
    });
    expect(gate.canMerge).toBe(false);
    expect(gate.label).toBe('Draft');
  });

  test('waits while mergeable is unknown', () => {
    const gate = getPullMergeGate({
      state: 'open',
      draft: false,
      mergeable: null,
    });
    expect(gate.canMerge).toBe(false);
    expect(gate.label).toBe('Checking…');
  });

  test('blocks when GitHub reports not mergeable', () => {
    const gate = getPullMergeGate({
      state: 'open',
      draft: false,
      mergeable: false,
    });
    expect(gate.canMerge).toBe(false);
    expect(gate.label).toBe('Not mergeable');
  });

  test('allows merge when mergeable even if checks are running', () => {
    const gate = getPullMergeGate({
      state: 'open',
      draft: false,
      mergeable: true,
      checksRunning: true,
    });
    expect(gate.canMerge).toBe(true);
    expect(gate.label).toBe('Checks running');
    expect(gate.reason).toContain('Checks are still running');
  });

  test('marks fully ready PRs as mergeable', () => {
    expect(
      getPullMergeGate({
        state: 'open',
        draft: false,
        mergeable: true,
        checksRunning: false,
      }),
    ).toEqual({
      canMerge: true,
      label: 'Mergeable',
      reason: null,
    });
  });
});

describe('formatPullActionError', () => {
  test('appends re-auth hint for 403 responses', () => {
    expect(
      formatPullActionError(new Error('403 Forbidden'), 'fallback'),
    ).toContain('sign out and sign in again');
  });

  test('does not duplicate re-auth hint', () => {
    const message =
      'Merge pull request failed: Resource not accessible. If this persists, sign out and sign in again to refresh GitHub permissions.';
    expect(formatPullActionError(new Error(message), 'fallback')).toBe(message);
  });

  test('passes through conflict and method-not-allowed messages', () => {
    expect(
      formatPullActionError(
        new Error('Merge pull request failed: Pull Request is not mergeable'),
        'fallback',
      ),
    ).toBe('Merge pull request failed: Pull Request is not mergeable');
    expect(
      formatPullActionError(
        new Error('Merge pull request failed: Method not allowed'),
        'fallback',
      ),
    ).toContain('Method not allowed');
  });

  test('uses fallback for unknown values', () => {
    expect(formatPullActionError(null, 'Failed to merge')).toBe(
      'Failed to merge',
    );
  });
});

describe('mergeMethodLabel', () => {
  test('labels each merge method', () => {
    expect(mergeMethodLabel('merge')).toBe('Create a merge commit');
    expect(mergeMethodLabel('squash')).toBe('Squash and merge');
    expect(mergeMethodLabel('rebase')).toBe('Rebase and merge');
  });
});
