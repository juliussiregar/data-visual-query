import type { WidgetType, WidgetVisualShape, WidgetConfig } from "@/lib/types";
import { buildOverviewRows } from "@/lib/overview-layout";
import { cn } from "@/lib/utils";

interface WidgetSilhouetteProps {
  type: WidgetType;
  compact?: boolean;
  active?: boolean;
  className?: string;
}

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] animate-[shimmer_2s_infinite]",
        className
      )}
    />
  );
}

export function WidgetSilhouette({ type, compact, active, className }: WidgetSilhouetteProps) {
  const base = cn(
    "relative overflow-hidden rounded-xl border bg-white transition-colors",
    active ? "border-indigo-300 bg-indigo-50" : "border-slate-200",
    compact ? "p-2" : "p-3",
    className
  );

  switch (type) {
    case "kpis":
      return (
        <div className={base}>
          <div className={cn("grid gap-1.5", compact ? "grid-cols-3" : "grid-cols-4")}>
            {Array.from({ length: compact ? 3 : 4 }).map((_, i) => (
              <div key={i} className="space-y-1 rounded-lg bg-slate-50 p-1.5">
                <Shimmer className="h-1.5 w-8" />
                <Shimmer className={cn(compact ? "h-3" : "h-4", "w-full")} />
              </div>
            ))}
          </div>
        </div>
      );

    case "hero_chart":
      return (
        <div className={base}>
          <Shimmer className={cn("mb-2 w-20", compact ? "h-2" : "h-2.5")} />
          <div className={cn("flex items-end gap-1", compact ? "h-10" : "h-16")}>
            {[40, 65, 45, 80, 55, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-indigo-500/25"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      );

    case "distribution":
      return (
        <div className={cn(base, "space-y-1.5")}>
          {[85, 60, 40, 25].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <Shimmer className="h-1.5 w-10 shrink-0" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-50">
                <div className="h-full rounded-full bg-violet-500/30" style={{ width: `${w}%` }} />
              </div>
            </div>
          ))}
        </div>
      );

    case "top_records":
      return (
        <div className={cn(base, "space-y-1")}>
          {Array.from({ length: compact ? 3 : 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-white p-1.5">
              <div className="h-5 w-5 shrink-0 rounded bg-slate-100" />
              <Shimmer className="h-2 flex-1" />
              <Shimmer className="h-2 w-8" />
            </div>
          ))}
        </div>
      );

    case "insights":
      return (
        <div className={cn(base, "grid grid-cols-2 gap-1.5")}>
          {Array.from({ length: compact ? 2 : 4 }).map((_, i) => (
            <div key={i} className="space-y-1 rounded-lg border border-slate-100 p-2">
              <Shimmer className="h-2 w-2 rounded-full" />
              <Shimmer className="h-2 w-full" />
              <Shimmer className="h-1.5 w-3/4" />
            </div>
          ))}
        </div>
      );

    case "chart":
      return (
        <div className={base}>
          <Shimmer className={cn("mb-2 w-16", compact ? "h-2" : "h-2.5")} />
          <div className={cn("relative", compact ? "h-10" : "h-14")}>
            <div className="absolute bottom-0 left-1/2 h-3/4 w-3/4 -translate-x-1/2 rounded-full border-[3px] border-cyan-500/20 border-t-cyan-500/50" />
          </div>
        </div>
      );

    default:
      return <div className={cn(base, compact ? "h-10" : "h-16")} />;
  }
}

/** Siluet bentuk widget kustom (langkah 1 builder) */
export function ShapeSilhouette({
  shape,
  compact,
  active,
  className,
}: {
  shape: WidgetVisualShape;
  compact?: boolean;
  active?: boolean;
  className?: string;
}) {
  const typeForShape: Record<WidgetVisualShape, WidgetType> = {
    stat: "chart",
    bar: "chart",
    line: "chart",
    donut: "chart",
    ranking: "top_records",
    distribution: "distribution",
    table: "chart",
  };

  if (shape === "table") {
    const base = cn(
      "relative overflow-hidden rounded-xl border bg-white transition-colors",
      active ? "border-indigo-300 bg-indigo-50" : "border-slate-200",
      compact ? "p-2" : "p-3",
      className
    );
    return (
      <div className={base}>
        <Shimmer className={cn("mb-2 w-16", compact ? "h-2" : "h-2.5")} />
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-1">
              <Shimmer className="h-2 flex-1" />
              <Shimmer className="h-2 w-8" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (shape === "stat") {
    const base = cn(
      "relative overflow-hidden rounded-xl border bg-white transition-colors",
      active ? "border-indigo-300 bg-indigo-50" : "border-slate-200",
      compact ? "p-2" : "p-3",
      className
    );
    return (
      <div className={base}>
        <Shimmer className={cn("mb-2 w-16", compact ? "h-2" : "h-2.5")} />
        <Shimmer className={cn(compact ? "h-8 w-20" : "h-10 w-24")} />
      </div>
    );
  }

  if (shape === "line") {
    const base = cn(
      "relative overflow-hidden rounded-xl border bg-white transition-colors",
      active ? "border-indigo-300 bg-indigo-50" : "border-slate-200",
      compact ? "p-2" : "p-3",
      className
    );
    return (
      <div className={base}>
        <Shimmer className={cn("mb-2 w-16", compact ? "h-2" : "h-2.5")} />
        <div className={cn("relative", compact ? "h-10" : "h-14")}>
          <svg viewBox="0 0 100 40" className="h-full w-full" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-cyan-500/50"
              points="0,35 20,20 40,28 60,10 80,18 100,5"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (shape === "bar") {
    const base = cn(
      "relative overflow-hidden rounded-xl border bg-white transition-colors",
      active ? "border-indigo-300 bg-indigo-50" : "border-slate-200",
      compact ? "p-2" : "p-3",
      className
    );
    return (
      <div className={base}>
        <Shimmer className={cn("mb-2 w-16", compact ? "h-2" : "h-2.5")} />
        <div className={cn("flex items-end gap-1", compact ? "h-10" : "h-14")}>
          {[40, 65, 45, 80, 55].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-indigo-500/30"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return <WidgetSilhouette type={typeForShape[shape]} compact={compact} active={active} className={className} />;
}

/** Mini dashboard layout from active widgets */
export function LayoutSilhouettePreview({
  widgets,
  className,
}: {
  widgets: WidgetConfig[];
  className?: string;
}) {
  const rows = buildOverviewRows(widgets);

  if (widgets.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center",
          className
        )}
      >
        <div className="mb-3 grid w-32 grid-cols-2 gap-2 opacity-30">
          <div className="h-8 rounded-lg bg-slate-100" />
          <div className="h-8 rounded-lg bg-slate-100" />
          <div className="col-span-2 h-12 rounded-lg bg-slate-100" />
        </div>
        <p className="text-xs text-slate-500">Add widgets to see layout</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3", className)}>
      {rows.map((row, idx) => {
        if (row.kind === "full") {
          const w = row.widgets[0];
          return w.visualShape ? (
            <ShapeSilhouette key={w.id} shape={w.visualShape} compact active />
          ) : (
            <WidgetSilhouette key={w.id} type={w.type} compact active />
          );
        }
        if (row.kind === "hero-pair") {
          return (
            <div key={`hero-${idx}`} className="grid grid-cols-5 gap-1.5">
              <div className="col-span-3">
                {row.widgets[0].visualShape ? (
                  <ShapeSilhouette shape={row.widgets[0].visualShape} compact active />
                ) : (
                  <WidgetSilhouette type={row.widgets[0].type} compact active />
                )}
              </div>
              <div className="col-span-2">
                {row.widgets[1].visualShape ? (
                  <ShapeSilhouette shape={row.widgets[1].visualShape} compact active />
                ) : (
                  <WidgetSilhouette type={row.widgets[1].type} compact active />
                )}
              </div>
            </div>
          );
        }
        return (
          <div
            key={`grid-${idx}`}
            className={cn(
              "grid gap-1.5",
              row.statRow ? "grid-cols-3" : "grid-cols-2"
            )}
          >
            {row.widgets.map((w) =>
              w.visualShape ? (
                <ShapeSilhouette key={w.id} shape={w.visualShape} compact active />
              ) : (
                <WidgetSilhouette key={w.id} type={w.type} compact active />
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
