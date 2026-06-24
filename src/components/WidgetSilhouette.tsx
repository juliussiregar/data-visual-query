import type { WidgetType } from "@/lib/types";
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
        "rounded-md bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-[shimmer_2s_infinite]",
        className
      )}
    />
  );
}

export function WidgetSilhouette({ type, compact, active, className }: WidgetSilhouetteProps) {
  const base = cn(
    "relative overflow-hidden rounded-xl border bg-slate-900/60 transition-colors",
    active ? "border-indigo-500/40 bg-indigo-500/5" : "border-white/10",
    compact ? "p-2" : "p-3",
    className
  );

  switch (type) {
    case "kpis":
      return (
        <div className={base}>
          <div className={cn("grid gap-1.5", compact ? "grid-cols-3" : "grid-cols-4")}>
            {Array.from({ length: compact ? 3 : 4 }).map((_, i) => (
              <div key={i} className="space-y-1 rounded-lg bg-white/5 p-1.5">
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
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
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
            <div key={i} className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-1.5">
              <div className="h-5 w-5 shrink-0 rounded bg-white/10" />
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
            <div key={i} className="space-y-1 rounded-lg border border-white/5 p-2">
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

/** Mini susunan dashboard dari widget yang aktif */
export function LayoutSilhouettePreview({
  widgets,
  className,
}: {
  widgets: { type: WidgetType; id: string }[];
  className?: string;
}) {
  if (widgets.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-12 text-center",
          className
        )}
      >
        <div className="mb-3 grid w-32 grid-cols-2 gap-2 opacity-30">
          <div className="h-8 rounded-lg bg-white/10" />
          <div className="h-8 rounded-lg bg-white/10" />
          <div className="col-span-2 h-12 rounded-lg bg-white/10" />
        </div>
        <p className="text-xs text-slate-500">Pilih widget untuk melihat susunan</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 rounded-xl border border-white/10 bg-slate-950/50 p-3", className)}>
      {widgets.map((w) => (
        <WidgetSilhouette key={w.id} type={w.type} compact active />
      ))}
    </div>
  );
}
