import { useEffect } from 'react';
import { useAppStore } from '../stores';

export function Toast() {
  const toast = useAppStore((s) => s.toast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      useAppStore.getState().clearToast();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm shadow-lg">
      {toast}
    </div>
  );
}
