import { useEffect, useRef } from 'react';

import type { ContextMenuPosition } from '../hooks/useContextMenuState';

export type ContextMenuItem = {
  id: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
};

type ContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function ContextMenu({
  x,
  y,
  items,
  onSelect,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 min-w-[180px] rounded-md border border-border bg-surface-elevated py-1 shadow-lg"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-surface disabled:opacity-40 ${
            item.danger ? 'text-danger' : ''
          }`}
          onClick={() => {
            if (item.disabled) return;
            onSelect(item.id);
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

type BoundContextMenuProps<T> = {
  state: (ContextMenuPosition & { data: T }) | null;
  items: ContextMenuItem[];
  onClose: () => void;
  onSelect: (id: string, data: T) => void;
};

export function BoundContextMenu<T>({
  state,
  items,
  onClose,
  onSelect,
}: BoundContextMenuProps<T>) {
  if (!state) return null;

  return (
    <ContextMenu
      x={state.x}
      y={state.y}
      items={items}
      onClose={onClose}
      onSelect={(id) => {
        const data = state.data;
        onClose();
        onSelect(id, data);
      }}
    />
  );
}
