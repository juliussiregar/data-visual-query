import type { DistributionItem } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { SectionHeader } from "./SectionHeader";
import { cn } from "@/lib/utils";

interface StatusDistributionProps {
  items: DistributionItem[];
  title?: string;
  onDrillDown?: (value: string) => void;
  activeValue?: string;
}

export function StatusDistribution({
  items,
  title = "Distribusi Kategori",
  onDrillDown,
  activeValue,
}: StatusDistributionProps) {
  if (items.length === 0) return null;

  return (
    <div className="surface-card p-5">
      <SectionHeader
        title={title}
        description={
          onDrillDown
            ? "Klik baris untuk memfilter data"
            : "Proporsi data berdasarkan kategori utama"
        }
        className="mb-4 border-none pb-0"
      />
      <div className="space-y-3">
        {items.map((item) => {
          const isActive = activeValue === item.label;
          return (
            <button
              key={item.label}
              type="button"
              disabled={!onDrillDown}
              onClick={() => onDrillDown?.(item.label)}
              className={cn(
                "group w-full rounded-lg text-left transition-colors",
                onDrillDown && "cursor-pointer hover:bg-slate-50",
                isActive && "bg-indigo-50 ring-1 ring-indigo-200"
              )}
            >
              <div className="mb-1.5 flex items-center justify-between px-1 text-sm">
                <span className="font-medium text-slate-800">{item.label}</span>
                <span className="text-slate-500">
                  {formatNumber(item.value)}{" "}
                  <span className="text-slate-400">({item.percentage.toFixed(1)}%)</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(item.percentage, 2)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
