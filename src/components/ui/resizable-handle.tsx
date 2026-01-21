import { useCallback, useEffect, useState, useRef } from 'react';
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
  const startPosRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    
    // Add dragging class to body for better cursor handling
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [direction]);

  useEffect(() => {
    if (!isDragging) return;

    let rafId: number | null = null;
    let lastUpdatePos = startPosRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      
      // Throttle updates based on position change to reduce frequency
      if (Math.abs(currentPos - lastUpdatePos) < 0.5) {
        return;
      }
      
      // Cancel any pending animation frame
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      // Use requestAnimationFrame for smoother updates
      rafId = requestAnimationFrame(() => {
        const delta = currentPos - startPosRef.current;
        startPosRef.current = currentPos;
        lastUpdatePos = currentPos;
        onResize(delta);
      });
    };

    const handleMouseUp = () => {
      // Cancel any pending animation frame
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      // Restore body styles
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      setIsDragging(false);
      onResizeEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Clean up animation frame and body styles on unmount
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, direction, onResize, onResizeEnd]);

  return (
    <div
      className={cn(
        "group relative flex-shrink-0 select-none",
        direction === 'horizontal'
          ? "w-1 hover:w-1"
          : "h-1 hover:h-1",
        isDragging && "z-50",
        className
      )}
      onMouseDown={handleMouseDown}
    >
      {/* Larger invisible hit area */}
      <div
        className={cn(
          "absolute z-10",
          direction === 'horizontal'
            ? "-left-2 -right-2 top-0 bottom-0 w-5 cursor-col-resize"
            : "-top-2 -bottom-2 left-0 right-0 h-5 cursor-row-resize"
        )}
      />
      {/* Visible handle line */}
      <div
        className={cn(
          "absolute",
          direction === 'horizontal'
            ? "left-0 right-0 top-0 bottom-0 w-1"
            : "top-0 bottom-0 left-0 right-0 h-1",
          isDragging
            ? "bg-primary opacity-100"
            : "bg-border opacity-60 group-hover:opacity-80 group-hover:bg-primary/60",
          "transition-opacity duration-100"
        )}
      />
      {/* Additional visual feedback when dragging */}
      {isDragging && (
        <div
          className={cn(
            "absolute bg-primary/20 pointer-events-none",
            direction === 'horizontal'
              ? "left-0 right-0 top-0 bottom-0 w-8 -ml-3.5"
              : "top-0 bottom-0 left-0 right-0 h-8 -mt-3.5"
          )}
        />
      )}
    </div>
  );
}
