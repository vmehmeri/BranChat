import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ResizableHandleProps {
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export function ResizableHandle({
  onResize,
  onResizeEnd,
  direction = 'horizontal',
  className,
}: ResizableHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartPos(direction === 'horizontal' ? e.clientX : e.clientY);
  }, [direction]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPos;
      setStartPos(currentPos);
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startPos, direction, onResize, onResizeEnd]);

  return (
    <div
      className={cn(
        "group relative flex-shrink-0 select-none",
        direction === 'horizontal'
          ? "w-1 cursor-col-resize hover:w-1"
          : "h-1 cursor-row-resize hover:h-1",
        className
      )}
      onMouseDown={handleMouseDown}
    >
      {/* Larger invisible hit area */}
      <div
        className={cn(
          "absolute z-10",
          direction === 'horizontal'
            ? "-left-1 -right-1 top-0 bottom-0 w-3"
            : "-top-1 -bottom-1 left-0 right-0 h-3"
        )}
      />
      {/* Visible handle line */}
      <div
        className={cn(
          "absolute transition-colors",
          direction === 'horizontal'
            ? "left-0 right-0 top-0 bottom-0 w-1"
            : "top-0 bottom-0 left-0 right-0 h-1",
          isDragging
            ? "bg-primary"
            : "bg-border group-hover:bg-primary/50"
        )}
      />
    </div>
  );
}
