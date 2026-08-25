import { useMemo } from 'react';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';
import { bundledLatestChangelog } from '../lib/whats-new';

function stripCommitLinks(entry: string): string {
  return entry.replace(/\s*\(\[[0-9a-f]{7,}\]\([^)]*\)\)/gi, '');
}

export function WhatsNewDialog() {
  const showWhatsNew = useAppStore((s) => s.showWhatsNew);
  const section = useMemo(() => bundledLatestChangelog(), []);

  if (!showWhatsNew) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="flex max-h-[70vh] w-full max-w-lg flex-col rounded-lg border border-border bg-surface p-5 shadow-xl">
        <h3 className="text-base font-semibold">What's new in GitLurk</h3>
        <p className="mt-1 text-xs text-muted">
          {section?.title ?? 'Changelog'}
        </p>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {section && section.entries.length > 0 ? (
            <ul className="list-disc space-y-1.5 pl-5">
              {section.entries.map((entry) => (
                <li key={entry} className="text-sm text-foreground">
                  {stripCommitLinks(entry)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No release notes available.</p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              void dispatcher.openExternal(
                'https://github.com/involvex/gitlurk/releases',
              );
            }}
            className="text-xs text-primary hover:underline"
          >
            Full changelog on GitHub
          </button>
          <button
            type="button"
            onClick={() => {
              if (section) {
                void dispatcher.markWhatsNewSeen(section.version);
              } else {
                useAppStore.getState().setShowWhatsNew(false);
              }
            }}
            className="rounded-md bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
