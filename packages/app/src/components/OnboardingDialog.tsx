import { useState } from 'react';
import { dispatcher } from '../dispatcher';
import { useAppStore } from '../stores';
import type { TerminalShell } from '../stores/ui';

type Step = 'welcome' | 'github' | 'terminal' | 'repo';

export function OnboardingDialog() {
  const show = useAppStore((s) => s.showOnboarding);
  const username = useAppStore((s) => s.username);
  const terminalShell = useAppStore((s) => s.terminalShell);
  const [step, setStep] = useState<Step>('welcome');

  if (!show) return null;

  const finish = async () => {
    await dispatcher.completeOnboarding();
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-xl">
        {step === 'welcome' ? (
          <>
            <h2 className="text-xl font-semibold">Welcome to GitLurk</h2>
            <p className="mt-2 text-sm text-muted">
              A fast Git client for Windows with GitHub integration, built-in
              terminal, and AI-assisted commits.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setStep('github')}
                className="rounded-md bg-accent px-4 py-2 text-sm text-white"
              >
                Get started
              </button>
            </div>
          </>
        ) : null}

        {step === 'github' ? (
          <>
            <h2 className="text-lg font-semibold">
              Sign in to GitHub (optional)
            </h2>
            <p className="mt-2 text-sm text-muted">
              Connect your account for notifications, pull requests, and
              discover features. You can skip and sign in later.
            </p>
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep('terminal')}
                className="rounded-md border border-border px-3 py-1.5 text-xs"
              >
                Skip
              </button>
              {username ? (
                <button
                  type="button"
                  onClick={() => setStep('terminal')}
                  className="rounded-md bg-accent px-4 py-2 text-sm text-white"
                >
                  Continue as @{username}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void dispatcher.signInGitHub()}
                  className="rounded-md bg-accent px-4 py-2 text-sm text-white"
                >
                  Sign in
                </button>
              )}
            </div>
          </>
        ) : null}

        {step === 'terminal' ? (
          <>
            <h2 className="text-lg font-semibold">Default terminal shell</h2>
            <p className="mt-2 text-sm text-muted">
              Choose the shell for the built-in terminal pane.
            </p>
            <select
              value={terminalShell}
              onChange={(e) => {
                void dispatcher.setTerminalShell(
                  e.target.value as TerminalShell,
                );
              }}
              className="mt-4 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm"
            >
              <option value="powershell">Windows PowerShell 5.1</option>
              <option value="pwsh">PowerShell 7 (pwsh)</option>
              <option value="cmd">Command Prompt (cmd)</option>
              <option value="custom">Custom executable…</option>
            </select>
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep('github')}
                className="rounded-md border border-border px-3 py-1.5 text-xs"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('repo')}
                className="rounded-md bg-accent px-4 py-2 text-sm text-white"
              >
                Continue
              </button>
            </div>
          </>
        ) : null}

        {step === 'repo' ? (
          <>
            <h2 className="text-lg font-semibold">Add your first repository</h2>
            <p className="mt-2 text-sm text-muted">
              Open a local folder or clone from GitHub to start working.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void dispatcher.openLocalRepo()}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-elevated"
              >
                Open local repo
              </button>
              <button
                type="button"
                onClick={() => useAppStore.getState().setShowCloneDialog(true)}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-elevated"
              >
                Clone from GitHub
              </button>
            </div>
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep('terminal')}
                className="rounded-md border border-border px-3 py-1.5 text-xs"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void finish()}
                className="rounded-md bg-accent px-4 py-2 text-sm text-white"
              >
                Finish
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
