export type MergeMethod = 'merge' | 'squash' | 'rebase';

export type PullMergeGateInput = {
  state: string;
  draft: boolean;
  mergeable: boolean | null;
  checksRunning?: boolean;
};

export type PullMergeGate = {
  /** Whether the Merge action should be enabled. */
  canMerge: boolean;
  /** Short status label shown next to merge controls. */
  label: string;
  /** Optional longer reason for disabled state. */
  reason: string | null;
};

/** Decide whether a PR can be merged from the detail header. */
export function getPullMergeGate(input: PullMergeGateInput): PullMergeGate {
  if (input.state.toLowerCase() !== 'open') {
    return {
      canMerge: false,
      label: 'Closed',
      reason: 'Only open pull requests can be merged',
    };
  }
  if (input.draft) {
    return {
      canMerge: false,
      label: 'Draft',
      reason: 'Ready for review before merging',
    };
  }
  if (input.mergeable === null) {
    return {
      canMerge: false,
      label: 'Checking…',
      reason: 'GitHub is still computing mergeability — refresh shortly',
    };
  }
  if (input.mergeable === false) {
    return {
      canMerge: false,
      label: 'Not mergeable',
      reason: 'Conflicts or branch protections block this merge',
    };
  }
  if (input.checksRunning) {
    return {
      canMerge: true,
      label: 'Checks running',
      reason: 'Checks are still running; merge may be blocked by branch rules',
    };
  }
  return {
    canMerge: true,
    label: 'Mergeable',
    reason: null,
  };
}

/** Humanize GitHub merge / update errors for toasts and the error banner. */
export function formatPullActionError(
  error: unknown,
  fallback: string,
): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : fallback;
  if (/403|permission|resource not accessible/i.test(message)) {
    if (!/sign out and sign in/i.test(message)) {
      return `${message}. If this persists, sign out and sign in again to refresh GitHub permissions.`;
    }
  }
  return message || fallback;
}

export function mergeMethodLabel(method: MergeMethod): string {
  switch (method) {
    case 'squash':
      return 'Squash and merge';
    case 'rebase':
      return 'Rebase and merge';
    default:
      return 'Create a merge commit';
  }
}
