import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}

export function UpdateDialog() {
  const showUpdateDialog = useAppStore((s) => s.showUpdateDialog);
  const updateCheck = useAppStore((s) => s.updateCheck);

  if (!showUpdateDialog) return null;

  const close = () => {
    useAppStore.getState().setShowUpdateDialog(false);
    useAppStore.getState().setUpdateCheck({ phase: 'idle' });
  };

  const percent =
    updateCheck.total && updateCheck.received != null
      ? Math.min(
          100,
          Math.round((updateCheck.received / updateCheck.total) * 100),
        )
      : null;

  let body: React.ReactNode;
  switch (updateCheck.phase) {
    case 'checking':
      body = <p className="text-sm text-muted">Checking for updates…</p>;
      break;
    case 'up-to-date':
      body = (
        <p className="text-sm text-muted">
          You're on the latest version of GitLurk Desktop.
        </p>
      );
      break;
    case 'available':
      body = (
        <div className="space-y-3">
          <p className="text-sm">
            Version{' '}
            <span className="font-mono text-primary">
              {updateCheck.version}
            </span>{' '}
            is available
            {updateCheck.currentVersion ? (
              <span className="text-muted">
                {' '}
                (installed: {updateCheck.currentVersion})
              </span>
            ) : null}
            .
          </p>
          {updateCheck.notes ? (
            <pre className="max-h-40 overflow-auto rounded-md border border-border bg-surface-elevated p-2 text-xs whitespace-pre-wrap text-muted">
              {updateCheck.notes}
            </pre>
          ) : null}
        </div>
      );
      break;
    case 'downloading':
      body = (
        <div className="space-y-2">
          <p className="text-sm text-muted">Downloading update…</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: percent == null ? '40%' : `${percent}%` }}
            />
          </div>
          <p className="text-xs text-muted">
            {percent != null ? `${percent}% · ` : ''}
            {formatBytes(updateCheck.received)}
            {updateCheck.total ? ` of ${formatBytes(updateCheck.total)}` : ''}
          </p>
        </div>
      );
      break;
    case 'installed':
      body = (
        <p className="text-sm">
          Update installed. Restart GitLurk to finish applying it.
        </p>
      );
      break;
    case 'error':
      body = (
        <p className="text-sm text-danger">
          {updateCheck.error ?? 'Something went wrong.'}
        </p>
      );
      break;
    default:
      body = null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl">
        <h3 className="text-base font-semibold">Software update</h3>
        <div className="mt-3">{body}</div>
        <div className="mt-5 flex items-center justify-end gap-2">
          {updateCheck.phase === 'error' ? (
            <button
              type="button"
              onClick={() => void dispatcher.checkForUpdates()}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated"
            >
              Retry
            </button>
          ) : null}
          {updateCheck.phase === 'available' ? (
            <button
              type="button"
              onClick={() => void dispatcher.installQueuedUpdate()}
              className="rounded-md bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover"
            >
              Install update
            </button>
          ) : null}
          {updateCheck.phase !== 'downloading' ? (
            <button
              type="button"
              onClick={close}
              className={
                updateCheck.phase === 'available'
                  ? 'rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated'
                  : 'rounded-md bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover'
              }
            >
              {updateCheck.phase === 'available' ? 'Later' : 'Close'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
