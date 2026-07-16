import { useAppStore } from '../stores';
import { dispatcher } from '../dispatcher';

export function AuthDialog() {
  const authDialog = useAppStore((s) => s.authDialog);

  if (!authDialog) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface-elevated p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Sign in to GitHub</h2>
        <p className="mt-2 text-sm text-muted">
          Enter this code at GitHub to authorize GitLurk.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3">
          <span className="font-mono text-2xl tracking-widest text-foreground">
            {authDialog.userCode}
          </span>
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard.writeText(authDialog.userCode)
            }
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-elevated"
          >
            Copy
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">{authDialog.status}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => void dispatcher.cancelGitHubSignIn()}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              void dispatcher.openExternal(authDialog.verificationUri)
            }
            className="rounded-md bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover"
          >
            Open GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
