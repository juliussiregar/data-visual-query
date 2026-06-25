"use client";

import type { SheetData, WidgetConfig } from "@/lib/types";
import {
  buildChartFromWidget,
  buildDistributionFromWidget,
  buildStatFromWidget,
  buildTableFromWidget,
  buildTopRecordsFromWidget,
} from "@/lib/widget-data";
import { ChartRenderer } from "./ChartRenderer";
import { WidgetStatCard } from "./WidgetStatCard";
import { StatusDistribution } from "./StatusDistribution";
import { TopRecords } from "./TopRecords";
import { DataTable } from "./DataTable";
import { resolveTablePanelHeight } from "@/lib/table-panel";
import { Eye } from "lucide-react";

interface WidgetPreviewProps {
  data: SheetData;
  widget: WidgetConfig;
}

export function WidgetPreview({ data, widget }: WidgetPreviewProps) {
  if (!widget.visualShape) return null;

  const empty = (
    <p className="py-8 text-center text-xs text-slate-400">
      Not enough data yet — adjust the options on the left.
    </p>
  );

  const renderBody = () => {
    if (widget.visualShape === "stat") {
      const stat = buildStatFromWidget(data, widget);
      if (!stat) return empty;
      return <WidgetStatCard label={stat.label} value={stat.value} compact />;
    }

    if (widget.visualShape === "distribution") {
      const items = buildDistributionFromWidget(data, widget);
      if (!items.length) return empty;
      return <StatusDistribution items={items} title="Preview" />;
    }

    if (widget.visualShape === "ranking") {
      const records = buildTopRecordsFromWidget(data, widget);
      if (!records.length) return empty;
      return <TopRecords records={records} title="Preview" />;
    }

    if (widget.visualShape === "table") {
      const table = buildTableFromWidget(data, widget);
      if (!table.rows.length) return empty;
      return (
        <div
          className="overflow-auto rounded-lg border border-slate-100"
          style={{
            height: Math.min(
              resolveTablePanelHeight(widget, {
                rowCount: table.totalRows,
                hasSummaryRow: Boolean(table.summaryRow),
              }),
              360
            ),
          }}
        >
          <DataTable
            rows={table.rows}
            columns={table.columns}
            canExport={false}
            compact
            fitContainer
            maxColumns={0}
            paginationMode="off"
            summaryRow={table.summaryRow}
          />
        </div>
      );
    }

    const chart = buildChartFromWidget(data, widget);
    if (!chart) {
      return (
        <p className="py-8 text-center text-xs text-slate-400">
          Select a <strong>Group by</strong> column to see the chart.
        </p>
      );
    }
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-3">
        <p className="mb-2 text-xs font-medium text-slate-700">{chart.title}</p>
        <div className="h-44">
          <ChartRenderer chart={chart} />
        </div>
      </div>
    );
  };

  return (
    <section className="sticky top-0 rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
        <Eye className="h-3.5 w-3.5" />
        Live preview
      </p>
      <div className="max-h-[min(420px,50vh)] overflow-y-auto">{renderBody()}</div>
    </section>
  );
}
