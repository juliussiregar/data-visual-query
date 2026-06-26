import type {
  ColumnMeta,
  ColumnType,
  DatasetMeta,
  FreshnessStatus,
  SemanticRole,
} from "./types";
import { inferSchemaFromKeys } from "./schema-registry";

const STALE_WARNING_MINUTES = 24 * 60;
const STALE_CRITICAL_MINUTES = 72 * 60;

interface FieldRule {
  pattern: RegExp;
  role: SemanticRole;
  sensitive?: boolean;
  businessLabel?: string;
  description?: string;
}

const FIELD_RULES: FieldRule[] = [
  {
    pattern: /^.+_id$/i,
    role: "dimension",
    businessLabel: "Foreign key",
    description: "Referensi ke entitas lain — boleh berulang di tabel agregat/fact",
  },
  {
    pattern: /student_code|device_code|_code$|^code$/i,
    role: "identifier",
    businessLabel: "Kode entitas",
    description: "Kode/ID record — bukan nilai uang atau metrik",
  },
  {
    pattern: /^no$|^id$|^id_|no[_\s]?(fasilitas|pengajuan|order|transaksi)/i,
    role: "identifier",
    businessLabel: "Identifier",
    description: "Kunci unik record",
  },
  {
    pattern: /nama|name|nasabah|debitur|customer|email|phone|telepon|nik|npwp/i,
    role: "sensitive",
    sensitive: true,
    businessLabel: "Informasi PII",
    description: "Data pribadi — masking untuk role Viewer",
  },
  {
    pattern: /tanggal|tgl|date|time|waktu|periode|bulan|tahun|created|updated/i,
    role: "date",
    businessLabel: "Tanggal/Waktu",
  },
  {
    pattern: /total_tunggakan|flag_npl|flag_approved|^sum_/i,
    role: "measure",
    businessLabel: "Metric Terhitung",
    description: "Calculated field dari semantic layer",
  },
  {
    pattern: /jumlah|amount|total|nilai|harga|biaya|qty|quantity|revenue|pendapatan|sales|budget|target|plafond|outstanding|pokok|bunga|tunggak|dpd|skor|sla_hari|jangka|saldo/i,
    role: "measure",
    description: "Field numerik",
  },
  {
    pattern: /kategori|category|type|tipe|jenis|segmen|segment|produk|product|channel|region|wilayah|cabang|branch|status|kolektibilitas|risk_grade|sla_status|departemen|team|rm$/i,
    role: "dimension",
    description: "Field pengelompokan",
  },
  {
    pattern: /deskripsi|description|catatan|note|alasan|referensi|keterangan/i,
    role: "information",
    description: "Informasi tambahan",
  },
];

function inferRoleFromType(type: ColumnType): SemanticRole {
  if (type === "number") return "measure";
  if (type === "date") return "date";
  if (type === "category") return "dimension";
  return "information";
}

export function classifyColumn(key: string, type: ColumnType): Pick<
  ColumnMeta,
  "semanticRole" | "sensitive" | "businessLabel" | "description"
> {
  for (const rule of FIELD_RULES) {
    if (rule.pattern.test(key)) {
      return {
        semanticRole: rule.role,
        sensitive: rule.sensitive ?? rule.role === "sensitive",
        businessLabel: rule.businessLabel ?? key.replace(/_/g, " "),
        description: rule.description,
      };
    }
  }

  const role = inferRoleFromType(type);
  return {
    semanticRole: role,
    sensitive: false,
    businessLabel: key.replace(/_/g, " "),
    description: undefined,
  };
}

export function enrichColumns(
  columns: ColumnMeta[],
  rows: Record<string, string>[]
): ColumnMeta[] {
  return columns.map((col) => {
    const classification = classifyColumn(col.key, col.type);
    const values = rows.map((r) => r[col.key] ?? "");
    const nonEmpty = values.filter((v) => v.trim() !== "");
    const nullCount = rows.length - nonEmpty.length;

    let duplicateCount: number | undefined;
    if (classification.semanticRole === "identifier" && nonEmpty.length > 0) {
      duplicateCount = nonEmpty.length - new Set(nonEmpty).size;
    }

    return {
      ...col,
      ...classification,
      nullCount,
      duplicateCount,
    };
  });
}

export function computeFreshness(fetchedAt: string): DatasetMeta["freshness"] {
  const fetched = new Date(fetchedAt).getTime();
  const ageMinutes = Math.max(0, Math.floor((Date.now() - fetched) / 60_000));

  let status: FreshnessStatus = "healthy";
  if (Number.isNaN(fetched)) {
    status = "unknown";
  } else if (ageMinutes >= STALE_CRITICAL_MINUTES) {
    status = "critical";
  } else if (ageMinutes >= STALE_WARNING_MINUTES) {
    status = "warning";
  }

  const formatted = Number.isNaN(fetched)
    ? "—"
    : new Date(fetchedAt).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  const labels: Record<FreshnessStatus, string> = {
    healthy: `Data segar · diperbarui ${formatted}`,
    warning: `Data perlu refresh · terakhir ${formatted}`,
    critical: `Data tertinggal · terakhir ${formatted}`,
    unknown: "Status freshness belum diketahui",
  };

  return {
    status,
    label: labels[status],
    fetchedAt,
    ageMinutes,
    staleThresholdMinutes: STALE_WARNING_MINUTES,
  };
}

function deriveDatasetName(
  sourceUrl: string,
  mergeMode: boolean,
  displayName?: string
): string {
  if (displayName?.trim()) return displayName.trim();
  if (mergeMode) return "Gabungan Multi-Sheet";
  return "Google Sheet";
}

export function buildDatasetMeta(
  rows: Record<string, string>[],
  columns: ColumnMeta[],
  sourceUrl: string,
  fetchedAt: string,
  mergeMode = false,
  displayName?: string
): DatasetMeta {
  const keys = columns.map((c) => c.key);
  const schemaId = inferSchemaFromKeys(keys);
  const dimensions = columns.filter((c) => c.semanticRole === "dimension").length;
  const measures = columns.filter((c) => c.semanticRole === "measure").length;
  const sensitive = columns.filter((c) => c.sensitive).length;
  const nullCells = columns.reduce((sum, c) => sum + (c.nullCount ?? 0), 0);
  const totalCells = rows.length * columns.length;

  const name = deriveDatasetName(sourceUrl, mergeMode, displayName);

  return {
    name,
    sourceType: mergeMode ? "merged" : "google_sheets",
    sourceUrl,
    schemaId,
    fetchedAt,
    freshness: computeFreshness(fetchedAt),
    profile: {
      rowCount: rows.length,
      columnCount: columns.length,
      dimensionCount: dimensions,
      measureCount: measures,
      sensitiveFieldCount: sensitive,
      nullCellRate: totalCells > 0 ? Math.round((nullCells / totalCells) * 100) : 0,
    },
  };
}

export const SEMANTIC_ROLE_LABELS: Record<SemanticRole, string> = {
  dimension: "Dimension",
  measure: "Measure",
  date: "Date",
  identifier: "Identifier",
  sensitive: "PII / Sensitif",
  information: "Informasi",
};
