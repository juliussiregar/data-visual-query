import type { ColumnLineage, ColumnMeta } from "./types";

export interface LineageContext {
  sourceUrl: string;
  mergeMode?: boolean;
  joinMode?: boolean;
}

function shortSheetLabel(sourceUrl: string): string {
  if (sourceUrl.includes("mock_db") || sourceUrl.includes("portofolio_kredit")) {
    return "Mock DB";
  }
  if (sourceUrl.includes("⨝")) return "Multi-sheet join";
  if (sourceUrl.includes("|")) return "Multi-sheet";
  if (sourceUrl.startsWith("postgres://") || sourceUrl.startsWith("postgresql://")) {
    return "PostgreSQL";
  }
  if (sourceUrl.startsWith("mysql://") || sourceUrl.startsWith("mariadb://")) {
    return "MySQL";
  }
  if (sourceUrl.includes("/spreadsheets/")) return "Google Sheet";
  return "Sumber data";
}

export function attachColumnLineage(
  columns: ColumnMeta[],
  ctx: LineageContext
): ColumnMeta[] {
  const baseLabel = shortSheetLabel(ctx.sourceUrl);

  return columns.map((col) => {
    const lineage = resolveLineage(col, ctx, baseLabel);
    return { ...col, lineage };
  });
}

function resolveLineage(
  col: ColumnMeta,
  ctx: LineageContext,
  baseLabel: string
): ColumnLineage {
  if (col.key === "_sheet") {
    return {
      sourceType: "merged",
      sourceLabel: "Union merge",
      sourceField: "_sheet",
      note: "Kolom sintetis penanda tab/sheet asal",
    };
  }

  if (col.key === "_join_source") {
    return {
      sourceType: "join",
      sourceLabel: "Relational join",
      sourceField: "_join_source",
      note: "Status baris setelah join",
    };
  }

  if (col.key.endsWith("_pengajuan")) {
    return {
      sourceType: "join",
      sourceLabel: "Tab pengajuan",
      sourceField: col.key.replace(/_pengajuan$/, ""),
      note: "Field dari sheet kanan setelah join",
    };
  }

  if (ctx.joinMode) {
    return {
      sourceType: "join",
      sourceLabel: baseLabel,
      sourceField: col.key,
      note: "Gabungan portofolio ⨝ pengajuan",
    };
  }

  if (ctx.mergeMode) {
    return {
      sourceType: "merged",
      sourceLabel: baseLabel,
      sourceField: col.key,
      note: "Union vertical multi-tab",
    };
  }

  return {
    sourceType: "google_sheets",
    sourceLabel: baseLabel,
    sourceField: col.key,
  };
}

export function buildLineageSummary(
  columns: ColumnMeta[],
  ctx: LineageContext
): string {
  const types = new Set(columns.map((c) => c.lineage?.sourceType ?? "google_sheets"));
  const parts: string[] = [];
  if (types.has("google_sheets")) parts.push(shortSheetLabel(ctx.sourceUrl));
  if (types.has("merged")) parts.push("union multi-sheet");
  if (types.has("join")) parts.push("relational join");
  return parts.join(" · ") || shortSheetLabel(ctx.sourceUrl);
}
