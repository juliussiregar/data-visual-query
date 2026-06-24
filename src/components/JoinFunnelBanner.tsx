"use client";

import { GitMerge } from "lucide-react";
import type { JoinConfig } from "@/lib/join-sheets";

interface JoinFunnelBannerProps {
  joinConfig: JoinConfig;
  totalPengajuan: number;
  approved: number;
  conversionRate: number;
  joinedRowCount: number;
}

export function JoinFunnelBanner({
  joinConfig,
  totalPengajuan,
  approved,
  conversionRate,
  joinedRowCount,
}: JoinFunnelBannerProps) {
  return (
    <div className="surface-card flex flex-wrap items-center gap-4 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
        <GitMerge className="h-4 w-4 text-indigo-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">Multi-sheet Join Aktif</p>
        <p className="text-[11px] text-slate-500">
          {joinConfig.leftKey} ⨝ {joinConfig.rightKey} ({joinConfig.joinType ?? "left"}) ·{" "}
          {joinedRowCount} baris hasil join
        </p>
      </div>
      <div className="flex flex-wrap gap-4 text-center">
        <div>
          <p className="text-lg font-bold text-slate-900">{totalPengajuan}</p>
          <p className="text-[10px] text-slate-500">Pengajuan</p>
        </div>
        <div>
          <p className="text-lg font-bold text-emerald-600">{approved}</p>
          <p className="text-[10px] text-slate-500">Disetujui</p>
        </div>
        <div>
          <p className="text-lg font-bold text-violet-600">{conversionRate.toFixed(1)}%</p>
          <p className="text-[10px] text-slate-500">Conversion</p>
        </div>
      </div>
    </div>
  );
}
