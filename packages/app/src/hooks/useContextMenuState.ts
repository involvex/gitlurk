import { useCallback, useState } from 'react';

export type ContextMenuPosition = {
  x: number;
  y: number;
};

export function useContextMenuState<T>() {
  const [state, setState] = useState<
    (ContextMenuPosition & { data: T }) | null
  >(null);

  const open = useCallback((event: React.MouseEvent, data: T) => {
    event.preventDefault();
    event.stopPropagation();
    setState({ x: event.clientX, y: event.clientY, data });
  }, []);

  const close = useCallback(() => setState(null), []);

  return { state, open, close };
}
