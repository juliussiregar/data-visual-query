import type { DataAlert, DataScope, SheetData } from "./types";
import type { Filters } from "./filters";
import { isScopeActive } from "./data-scope";
import { formatNumber } from "./format";

export function computeDataAlerts(
  base: SheetData,
  display: SheetData,
  filters: Filters,
  scope: DataScope | null,
  scopedRowCount: number
): DataAlert[] {
  const alerts: DataAlert[] = [];
  const totalRows = base.rows.length;
  const visibleRows = display.rows.length;
  const hasFilters = Object.values(filters).some(Boolean);
  const hasScope = isScopeActive(scope);

  if (hasScope && scope) {
    const col = base.columns.find((c) => c.key === scope.columnKey);
    alerts.push({
      id: "scope-active",
      severity: "info",
      title: "Scope akses aktif",
      description: `Hanya baris dengan ${col?.label ?? scope.columnKey} = ${scope.values.join(", ")} (${formatNumber(scopedRowCount)} dari ${formatNumber(totalRows)} baris).`,
    });
  }

  if (visibleRows === 0 && (hasFilters || hasScope)) {
    alerts.push({
      id: "empty-result",
      severity: "critical",
      title: "Tidak ada data cocok",
      description: "Filter atau scope saat ini tidak menghasilkan baris. Coba longgarkan filter atau ubah scope.",
    });
  }

  if (hasFilters && scopedRowCount > 0 && visibleRows > 0) {
    const ratio = visibleRows / scopedRowCount;
    if (ratio < 0.15) {
      alerts.push({
        id: "sharp-filter-reduction",
        severity: "warning",
        title: "Filter sangat ketat",
        description: `Hanya ${formatNumber(visibleRows)} baris (${(ratio * 100).toFixed(0)}%) dari ${formatNumber(scopedRowCount)} baris dalam scope.`,
      });
    }
  }

  const nullRate = display.dataset?.profile.nullCellRate ?? 0;
  if (nullRate >= 25) {
    alerts.push({
      id: "high-null-rate",
      severity: "warning",
      title: "Banyak sel kosong",
      description: `${nullRate}% sel kosong pada dataset — pertimbangkan validasi sumber data.`,
    });
  }

  const topDist = display.distributions[0];
  if (topDist && topDist.percentage >= 75 && display.distributions.length >= 2) {
    alerts.push({
      id: "dominant-category",
      severity: "info",
      title: `Kategori dominan: ${topDist.label}`,
      description: `${topDist.percentage.toFixed(0)}% baris berada di kategori ini — distribusi cukup timpang.`,
    });
  }

  const freshness = display.dataset?.freshness.status;
  if (freshness === "warning" || freshness === "critical") {
    alerts.push({
      id: "stale-data",
      severity: freshness === "critical" ? "critical" : "warning",
      title: freshness === "critical" ? "Data tertinggal" : "Data perlu refresh",
      description: display.dataset?.freshness.label ?? "Perbarui sheet untuk analisis terkini.",
    });
  }

  return alerts;
}
