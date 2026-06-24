"use client";

import { useMemo, useState } from "react";
import { BarChart3, LayoutDashboard, Search, Sparkles, X } from "lucide-react";
import type { ChartConfig, SheetData } from "@/lib/types";
import { ChartCard } from "./ChartCard";
import { aggregationLabel } from "@/lib/chart-labels";
import { cn } from "@/lib/utils";

type AggFilter = "all" | ChartConfig["aggregation"];

interface ChartsGalleryProps {
  data: SheetData;
  onDrillDown?: (columnKey: string, value: string) => void;
  onGoOverview?: () => void;
}

const AGG_FILTERS: { id: AggFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "count", label: "Counts" },
  { id: "sum", label: "Totals" },
  { id: "avg", label: "Averages" },
];

function matchesSearch(chart: ChartConfig, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    chart.title.toLowerCase().includes(q) ||
    (chart.description?.toLowerCase().includes(q) ?? false) ||
    chart.categoryKey.toLowerCase().includes(q)
  );
}

export function ChartsGallery({ data, onDrillDown, onGoOverview }: ChartsGalleryProps) {
  const [search, setSearch] = useState("");
  const [aggFilter, setAggFilter] = useState<AggFilter>("all");

  const charts = data.charts;

  const filtered = useMemo(() => {
    return charts.filter((c) => {
      if (aggFilter !== "all" && c.aggregation !== aggFilter) return false;
      return matchesSearch(c, search);
    });
  }, [charts, aggFilter, search]);

  const featured = useMemo(() => {
    const fromFiltered = filtered.find((c) => c.featured);
    return fromFiltered ?? filtered[0];
  }, [filtered]);

  const rest = useMemo(
    () => (featured ? filtered.filter((c) => c.id !== featured.id) : filtered),
    [filtered, featured]
  );

  const stats = useMemo(() => {
    const byAgg = { count: 0, sum: 0, avg: 0, other: 0 };
    for (const c of charts) {
      if (c.aggregation === "count") byAgg.count += 1;
      else if (c.aggregation === "sum") byAgg.sum += 1;
      else if (c.aggregation === "avg") byAgg.avg += 1;
      else byAgg.other += 1;
    }
    return byAgg;
  }, [charts]);

  const handleDrill = (chart: ChartConfig) =>
    onDrillDown ? (value: string) => onDrillDown(chart.categoryKey, value) : undefined;

  if (charts.length === 0) {
    return (
      <div className="space-y-5">
        <header>
          <h2 className="text-lg font-semibold text-slate-900">Charts</h2>
          <p className="mt-1 text-sm text-slate-500">
            Auto-generated visualizations from your columns.
          </p>
        </header>
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <BarChart3 className="h-10 w-10 text-slate-300" />
          <h3 className="mt-4 text-base font-semibold text-slate-900">No charts yet</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Charts appear when your data has category columns with enough variety. Try loading more
            rows or add custom chart widgets on Overview.
          </p>
          {onGoOverview && (
            <button
              type="button"
              onClick={onGoOverview}
              className="btn-primary mt-6 gap-2 px-5 py-2.5 text-sm"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to Overview
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Charts</h2>
          <p className="mt-1 text-sm text-slate-500">
            {charts.length} auto-generated visualizations · click a segment to filter data
          </p>
        </div>
        {onGoOverview && (
          <button
            type="button"
            onClick={onGoOverview}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-700"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Custom widgets on Overview
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: charts.length },
          { label: "Counts", value: stats.count },
          { label: "Totals", value: stats.sum },
          { label: "Averages", value: stats.avg },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center"
          >
            <p className="text-2xl font-bold tabular-nums text-slate-900">{s.value}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="surface-card space-y-3 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or column…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {AGG_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setAggFilter(f.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                aggFilter === f.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
          No charts match your search.{" "}
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setAggFilter("all");
            }}
            className="font-medium text-indigo-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {featured && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-800">Highlighted</h3>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {aggregationLabel(featured.aggregation)}
                </span>
              </div>
              <ChartCard
                chart={featured}
                defaultLarge
                pickerStyle="select"
                onDrillDown={handleDrill(featured)}
                className="animate-fade-in-up"
              />
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                All charts
                <span className="ml-2 font-normal text-slate-400">({rest.length})</span>
              </h3>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {rest.map((chart, i) => (
                  <ChartCard
                    key={chart.id}
                    chart={chart}
                    pickerStyle="select"
                    onDrillDown={handleDrill(chart)}
                    className={`animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
