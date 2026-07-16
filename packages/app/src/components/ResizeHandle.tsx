import { useCallback, useEffect, useRef } from 'react';

type Orientation = 'vertical' | 'horizontal';

export function ResizeHandle({
  orientation,
  onDrag,
  className = '',
}: {
  orientation: Orientation;
  onDrag: (delta: number) => void;
  className?: string;
}) {
  const dragging = useRef(false);
  const last = useRef(0);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      dragging.current = true;
      last.current = orientation === 'vertical' ? event.clientX : event.clientY;
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [orientation],
  );

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const pos = orientation === 'vertical' ? event.clientX : event.clientY;
      const delta = pos - last.current;
      last.current = pos;
      if (delta !== 0) onDrag(delta);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onDrag, orientation]);

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      onPointerDown={onPointerDown}
      className={
        orientation === 'vertical'
          ? `w-1 shrink-0 cursor-col-resize bg-border/60 hover:bg-primary/50 ${className}`
          : `h-1 shrink-0 cursor-row-resize bg-border/60 hover:bg-primary/50 ${className}`
      }
    />
  );
}
