import type { TopRecord } from "@/lib/types";
import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";

interface TopRecordsProps {
  records: TopRecord[];
  title?: string;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
        <Trophy className="h-4 w-4 text-amber-400" />
      </div>
    );
  if (rank <= 3)
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/20">
        <Medal className="h-4 w-4 text-slate-600" />
      </div>
    );
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-xs font-bold text-slate-500">
      {rank}
    </div>
  );
}

function statusColor(status?: string): string {
  if (!status) return "bg-slate-500/20 text-slate-400";
  const s = status.toLowerCase();
  if (s.includes("akad")) return "bg-emerald-500/20 text-emerald-700";
  if (s.includes("cancel")) return "bg-red-500/20 text-red-600";
  if (s.includes("progress")) return "bg-amber-100 text-amber-700";
  if (s.includes("sp3k")) return "bg-indigo-100 text-indigo-600";
  return "bg-slate-500/20 text-slate-400";
}

export function TopRecords({ records, title = "Top Records" }: TopRecordsProps) {
  if (records.length === 0) return null;

  return (
    <div className="glass-card animate-fade-in-up rounded-2xl p-5">
      <SectionHeader title={title} description="Ranking berdasarkan nilai numerik tertinggi" />
      <div className="space-y-2">
        {records.map((record) => (
          <div
            key={record.rank}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all hover:border-slate-200 hover:bg-slate-50",
              record.rank === 1 && "bg-amber-500/5"
            )}
          >
            <RankBadge rank={record.rank} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{record.label}</p>
              {record.badge && (
                <span
                  className={cn(
                    "mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-medium",
                    statusColor(record.badge)
                  )}
                >
                  {record.badge}
                </span>
              )}
            </div>
            <p className="shrink-0 text-sm font-semibold text-indigo-600">
              {record.valueFormatted}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
