"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { clampTablePanelHeight } from "@/lib/table-panel";
import { cn } from "@/lib/utils";

interface TableWidgetPanelProps {
  height: number;
  onHeightChange: (px: number) => void;
  header: ReactNode;
  children: ReactNode;
  className?: string;
}

export function TableWidgetPanel({
  height,
  onHeightChange,
  header,
  children,
  className,
}: TableWidgetPanelProps) {
  const [liveHeight, setLiveHeight] = useState(height);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current) setLiveHeight(height);
  }, [height]);

  const onResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragging.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = liveHeight;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setLiveHeight(
      clampTablePanelHeight(dragStartHeight.current + (e.clientY - dragStartY.current))
    );
  };

  const finishResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    dragging.current = false;
    const next = clampTablePanelHeight(
      dragStartHeight.current + (e.clientY - dragStartY.current)
    );
    setLiveHeight(next);
    onHeightChange(next);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className={cn("surface-card flex flex-col overflow-hidden", className)}>
      <div className="shrink-0 px-4 pt-4">{header}</div>
      <div
        className="min-h-0 overflow-auto px-4 pb-3"
        style={{ height: liveHeight }}
      >
        {children}
      </div>
      <div
        role="separator"
        aria-label="Resize table height"
        title="Drag to resize height"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={finishResize}
        onPointerCancel={finishResize}
        className="flex h-3 shrink-0 cursor-ns-resize items-center justify-center border-t border-slate-100 bg-slate-50/90 transition-colors hover:bg-indigo-50/70"
      >
        <div className="h-1 w-12 rounded-full bg-slate-300" />
      </div>
    </div>
  );
}
