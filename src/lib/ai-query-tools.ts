import type OpenAI from "openai";
import type { AiQueryDataset, AiQueryFact } from "./types";
import { findColumnKey } from "./chat-actions";
import { aggregateData } from "./aggregation";
import { parseNumber, formatNumber, formatCurrency } from "./format";
import {
  applyVisualQuery,
  QUERY_OPERATORS,
  type QueryOperator,
  type VisualQuery,
} from "./visual-query";

export type AiToolName =
  | "count_rows"
  | "aggregate_column"
  | "group_by"
  | "top_rows"
  | "distinct_values"
  | "compare_groups"
  | "column_stats";

type FilterInput = {
  column: string;
  operator?: string;
  value?: string;
  value_to?: string;
};

function resolveColumn(dataset: AiQueryDataset, ref: string): string | undefined {
  return findColumnKey(ref, dataset.columns) ?? undefined;
}

function columnLabel(dataset: AiQueryDataset, key: string): string {
  const col = dataset.columns.find((c) => c.key === key);
  return col?.businessLabel ?? col?.label ?? key;
}

function isSensitive(dataset: AiQueryDataset, key: string): boolean {
  return dataset.columns.find((c) => c.key === key)?.sensitive ?? false;
}

function filtersToQuery(
  dataset: AiQueryDataset,
  filters?: FilterInput[],
  searchText?: string
): VisualQuery {
  const conditions = (filters ?? [])
    .map((f, i) => {
      const columnKey = resolveColumn(dataset, f.column);
      if (!columnKey) return null;
      const op = QUERY_OPERATORS.includes(f.operator as QueryOperator)
        ? (f.operator as QueryOperator)
        : "equals";
      return {
        id: `tool-${i}`,
        columnKey,
        operator: op,
        value: f.value ?? "",
        valueTo: f.value_to,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return { searchText: searchText?.trim() ?? "", conditions, sort: null };
}

function filterRows(
  dataset: AiQueryDataset,
  filters?: FilterInput[],
  searchText?: string
): Record<string, string>[] {
  const query = filtersToQuery(dataset, filters, searchText);
  return applyVisualQuery(dataset.rows, query, dataset.columns);
}

function formatAggValue(
  aggregation: string,
  value: number,
  columnKey?: string,
  dataset?: AiQueryDataset
): string {
  const col = columnKey && dataset ? dataset.columns.find((c) => c.key === columnKey) : undefined;
  const isMoney =
    col?.label.toLowerCase().includes("plafond") ||
    col?.label.toLowerCase().includes("rupiah") ||
    col?.label.toLowerCase().includes("nominal");
  if (aggregation === "count") return String(Math.round(value));
  if (isMoney) return formatCurrency(value);
  return formatNumber(value);
}

function aggregateOnRows(
  rows: Record<string, string>[],
  measureKey: string | undefined,
  aggregation: "count" | "sum" | "avg" | "min" | "max"
): { value: number; numericCount: number } {
  if (aggregation === "count" || !measureKey) {
    return { value: rows.length, numericCount: rows.length };
  }

  const nums = rows
    .map((r) => parseNumber(r[measureKey]))
    .filter((n): n is number => n !== null);

  if (nums.length === 0) return { value: 0, numericCount: 0 };

  let value: number;
  switch (aggregation) {
    case "sum":
      value = nums.reduce((a, b) => a + b, 0);
      break;
    case "avg":
      value = nums.reduce((a, b) => a + b, 0) / nums.length;
      break;
    case "min":
      value = Math.min(...nums);
      break;
    case "max":
      value = Math.max(...nums);
      break;
    default:
      value = nums.length;
  }
  return { value, numericCount: nums.length };
}

export const AI_QUERY_TOOL_DEFINITIONS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "count_rows",
      description:
        "Hitung jumlah baris setelah filter. WAJIB untuk pertanyaan 'berapa banyak', 'jumlah record', dll.",
      parameters: {
        type: "object",
        properties: {
          filters: {
            type: "array",
            description: "Filter AND — semua harus cocok",
            items: {
              type: "object",
              properties: {
                column: { type: "string", description: "Nama atau key kolom" },
                operator: {
                  type: "string",
                  enum: QUERY_OPERATORS,
                },
                value: { type: "string" },
                value_to: { type: "string", description: "Untuk operator between" },
              },
              required: ["column"],
            },
          },
          search_text: { type: "string", description: "Cari teks di semua kolom" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "aggregate_column",
      description:
        "Agregasi satu kolom numerik (sum/avg/min/max/count) dengan filter opsional. WAJIB untuk total, rata-rata, dll.",
      parameters: {
        type: "object",
        properties: {
          measure_column: {
            type: "string",
            description: "Kolom numerik — kosongkan untuk count baris",
          },
          aggregation: {
            type: "string",
            enum: ["count", "sum", "avg", "min", "max"],
          },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: QUERY_OPERATORS },
                value: { type: "string" },
                value_to: { type: "string" },
              },
              required: ["column"],
            },
          },
          search_text: { type: "string" },
        },
        required: ["aggregation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "group_by",
      description:
        "Kelompokkan baris per dimensi lalu agregasi. WAJIB untuk distribusi, perbandingan kategori, ranking grup.",
      parameters: {
        type: "object",
        properties: {
          group_by_column: { type: "string", description: "Kolom dimensi/kategori" },
          measure_column: { type: "string", description: "Kolom numerik — opsional untuk count" },
          aggregation: {
            type: "string",
            enum: ["count", "sum", "avg", "min", "max"],
          },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: QUERY_OPERATORS },
                value: { type: "string" },
              },
              required: ["column"],
            },
          },
          limit: { type: "number", description: "Maks grup dikembalikan (default 25)" },
          sort: { type: "string", enum: ["desc", "asc"], description: "Urutkan by nilai agregasi" },
        },
        required: ["group_by_column", "aggregation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "top_rows",
      description: "Ambil baris teratas/terbawah berdasarkan kolom sort.",
      parameters: {
        type: "object",
        properties: {
          sort_column: { type: "string" },
          direction: { type: "string", enum: ["desc", "asc"] },
          limit: { type: "number" },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: QUERY_OPERATORS },
                value: { type: "string" },
              },
              required: ["column"],
            },
          },
          display_columns: {
            type: "array",
            items: { type: "string" },
            description: "Kolom yang ditampilkan — default 6 pertama",
          },
        },
        required: ["sort_column"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "distinct_values",
      description: "Daftar nilai unik pada kolom beserta frekuensi.",
      parameters: {
        type: "object",
        properties: {
          column: { type: "string" },
          limit: { type: "number" },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: QUERY_OPERATORS },
                value: { type: "string" },
              },
              required: ["column"],
            },
          },
        },
        required: ["column"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_groups",
      description:
        "Bandingkan agregasi antara dua set filter (mis. cabang A vs B, status Akad vs SP3K).",
      parameters: {
        type: "object",
        properties: {
          group_a_label: { type: "string" },
          group_a_filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: QUERY_OPERATORS },
                value: { type: "string" },
              },
              required: ["column", "value"],
            },
          },
          group_b_label: { type: "string" },
          group_b_filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: QUERY_OPERATORS },
                value: { type: "string" },
              },
              required: ["column", "value"],
            },
          },
          measure_column: { type: "string" },
          aggregation: {
            type: "string",
            enum: ["count", "sum", "avg", "min", "max"],
          },
        },
        required: ["group_a_label", "group_a_filters", "group_b_label", "group_b_filters", "aggregation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "column_stats",
      description: "Statistik lengkap satu kolom (numerik atau kategorikal).",
      parameters: {
        type: "object",
        properties: {
          column: { type: "string" },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: QUERY_OPERATORS },
                value: { type: "string" },
              },
              required: ["column"],
            },
          },
        },
        required: ["column"],
      },
    },
  },
];

export function executeAiQueryTool(
  dataset: AiQueryDataset,
  name: string,
  argsJson: string,
  allowSensitive = false
): { result: unknown; fact: AiQueryFact } {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return {
      result: { error: "Argumen tool tidak valid JSON" },
      fact: { tool: name, summary: "Error: argumen invalid" },
    };
  }

  try {
    switch (name as AiToolName) {
      case "count_rows":
        return execCountRows(dataset, args);
      case "aggregate_column":
        return execAggregateColumn(dataset, args);
      case "group_by":
        return execGroupBy(dataset, args, allowSensitive);
      case "top_rows":
        return execTopRows(dataset, args, allowSensitive);
      case "distinct_values":
        return execDistinctValues(dataset, args, allowSensitive);
      case "compare_groups":
        return execCompareGroups(dataset, args);
      case "column_stats":
        return execColumnStats(dataset, args, allowSensitive);
      default:
        return {
          result: { error: `Tool tidak dikenal: ${name}` },
          fact: { tool: name, summary: "Tool tidak dikenal" },
        };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Eksekusi tool gagal";
    return { result: { error: msg }, fact: { tool: name, summary: msg } };
  }
}

function execCountRows(dataset: AiQueryDataset, args: Record<string, unknown>) {
  const filters = args.filters as FilterInput[] | undefined;
  const searchText = args.search_text as string | undefined;
  const rows = filterRows(dataset, filters, searchText);
  const filterDesc = filters?.length
    ? ` dengan ${filters.length} filter`
    : searchText
      ? ` cari "${searchText}"`
      : "";
  return {
    result: {
      count: rows.length,
      filters_applied: filters ?? [],
      search_text: searchText ?? null,
    },
    fact: {
      tool: "count_rows",
      summary: `${rows.length.toLocaleString("id-ID")} baris${filterDesc}`,
    },
  };
}

function execAggregateColumn(dataset: AiQueryDataset, args: Record<string, unknown>) {
  const aggregation = (args.aggregation as string) || "count";
  const measureRef = args.measure_column as string | undefined;
  const measureKey = measureRef ? resolveColumn(dataset, measureRef) : undefined;
  const filters = args.filters as FilterInput[] | undefined;
  const searchText = args.search_text as string | undefined;

  if (aggregation !== "count" && !measureKey) {
    return {
      result: { error: `Kolom numerik tidak ditemukan: ${measureRef}` },
      fact: { tool: "aggregate_column", summary: `Kolom tidak ditemukan: ${measureRef}` },
    };
  }

  const rows = filterRows(dataset, filters, searchText);
  const agg = aggregation as "count" | "sum" | "avg" | "min" | "max";
  const { value, numericCount } = aggregateOnRows(rows, measureKey ?? undefined, agg);

  const measureLabel = measureKey ? columnLabel(dataset, measureKey) : "baris";
  return {
    result: {
      aggregation: agg,
      measure_column: measureKey,
      measure_label: measureLabel,
      value,
      value_formatted: formatAggValue(agg, value, measureKey ?? undefined, dataset),
      row_count: rows.length,
      numeric_values_used: numericCount,
      filters_applied: filters ?? [],
    },
    fact: {
      tool: "aggregate_column",
      summary: `${agg.toUpperCase()} ${measureLabel} = ${formatAggValue(agg, value, measureKey ?? undefined, dataset)} (${rows.length} baris)`,
    },
  };
}

function execGroupBy(
  dataset: AiQueryDataset,
  args: Record<string, unknown>,
  allowSensitive: boolean
) {
  const groupRef = args.group_by_column as string;
  const groupKey = resolveColumn(dataset, groupRef);
  if (!groupKey) {
    return {
      result: { error: `Kolom grup tidak ditemukan: ${groupRef}` },
      fact: { tool: "group_by", summary: `Grup tidak ditemukan: ${groupRef}` },
    };
  }

  if (!allowSensitive && isSensitive(dataset, groupKey)) {
    return {
      result: { error: `Kolom "${columnLabel(dataset, groupKey)}" berisi data sensitif (PII) — tidak boleh dipakai sebagai dimensi pengelompokan.` },
      fact: { tool: "group_by", summary: `Grup PII ${columnLabel(dataset, groupKey)} ditolak` },
    };
  }

  const measureRef = args.measure_column as string | undefined;
  const measureKey = measureRef ? resolveColumn(dataset, measureRef) ?? undefined : undefined;
  const aggregation = (args.aggregation as string) || "count";
  const filters = args.filters as FilterInput[] | undefined;
  const limit = typeof args.limit === "number" ? args.limit : 25;
  const sortDir = args.sort === "asc" ? "asc" : "desc";

  const rows = filterRows(dataset, filters);
  const agg = aggregation as "count" | "sum" | "avg" | "min" | "max";
  let groups = aggregateData(rows, groupKey, measureKey, agg);

  if (sortDir === "asc") groups = [...groups].sort((a, b) => a.value - b.value);
  groups = groups.slice(0, limit);

  const groupLabel = columnLabel(dataset, groupKey);
  return {
    result: {
      group_by_column: groupKey,
      group_by_label: groupLabel,
      measure_column: measureKey,
      aggregation: agg,
      row_count: rows.length,
      groups: groups.map((g) => ({
        name: g.name,
        value: g.value,
        value_formatted: formatAggValue(agg, g.value, measureKey, dataset),
        percentage: g.percentage,
      })),
    },
    fact: {
      tool: "group_by",
      summary: `${groups.length} grup by ${groupLabel} (${agg}) — top: ${groups[0]?.name ?? "—"} = ${groups[0] ? formatAggValue(agg, groups[0].value, measureKey, dataset) : "—"}`,
    },
  };
}

function execTopRows(
  dataset: AiQueryDataset,
  args: Record<string, unknown>,
  allowSensitive: boolean
) {
  const sortRef = args.sort_column as string;
  const sortKey = resolveColumn(dataset, sortRef);
  if (!sortKey) {
    return {
      result: { error: `Kolom sort tidak ditemukan: ${sortRef}` },
      fact: { tool: "top_rows", summary: `Sort kolom tidak ditemukan` },
    };
  }

  const direction = args.direction === "asc" ? "asc" : "desc";
  const limit = typeof args.limit === "number" ? args.limit : 10;
  const filters = args.filters as FilterInput[] | undefined;
  const displayRefs = args.display_columns as string[] | undefined;

  const baseQuery = filtersToQuery(dataset, filters);
  const query: VisualQuery = {
    ...baseQuery,
    sort: { columnKey: sortKey, direction },
  };
  const sorted = applyVisualQuery(dataset.rows, query, dataset.columns).slice(0, limit);

  const displayKeys = (
    displayRefs
      ?.map((r) => resolveColumn(dataset, r))
      .filter((k): k is string => Boolean(k)) ??
    dataset.columns
      .filter((c) => c.key.trim() && !c.sensitive)
      .slice(0, 6)
      .map((c) => c.key)
  ).filter((key) => allowSensitive || !isSensitive(dataset, key));

  const rows = sorted.map((row) => {
    const out: Record<string, string> = {};
    for (const key of displayKeys) {
      const col = dataset.columns.find((c) => c.key === key);
      out[col?.label ?? key] = row[key] ?? "";
    }
    return out;
  });

  return {
    result: {
      sort_column: sortKey,
      direction,
      limit,
      rows,
    },
    fact: {
      tool: "top_rows",
      summary: `Top ${rows.length} by ${columnLabel(dataset, sortKey)} (${direction})`,
    },
  };
}

function execDistinctValues(
  dataset: AiQueryDataset,
  args: Record<string, unknown>,
  allowSensitive: boolean
) {
  const colRef = args.column as string;
  const colKey = resolveColumn(dataset, colRef);
  if (!colKey) {
    return {
      result: { error: `Kolom tidak ditemukan: ${colRef}` },
      fact: { tool: "distinct_values", summary: `Kolom tidak ditemukan` },
    };
  }

  if (!allowSensitive && isSensitive(dataset, colKey)) {
    return {
      result: { error: `Kolom "${columnLabel(dataset, colKey)}" berisi data sensitif (PII) — nilainya tidak boleh ditampilkan.` },
      fact: { tool: "distinct_values", summary: `Kolom PII ${columnLabel(dataset, colKey)} ditolak` },
    };
  }

  const limit = typeof args.limit === "number" ? args.limit : 50;
  const filters = args.filters as FilterInput[] | undefined;
  const rows = filterRows(dataset, filters);
  const dist = aggregateData(rows, colKey, undefined, "count").slice(0, limit);

  return {
    result: {
      column: colKey,
      column_label: columnLabel(dataset, colKey),
      unique_count: dist.length,
      values: dist.map((d) => ({ value: d.name, count: d.value, percentage: d.percentage })),
    },
    fact: {
      tool: "distinct_values",
      summary: `${dist.length} nilai unik pada ${columnLabel(dataset, colKey)}`,
    },
  };
}

function execCompareGroups(dataset: AiQueryDataset, args: Record<string, unknown>) {
  const agg = (args.aggregation as string) || "count";
  const measureRef = args.measure_column as string | undefined;
  const measureKey = measureRef ? resolveColumn(dataset, measureRef) : undefined;
  const aggregation = agg as "count" | "sum" | "avg" | "min" | "max";

  const labelA = (args.group_a_label as string) || "Grup A";
  const labelB = (args.group_b_label as string) || "Grup B";
  const filtersA = args.group_a_filters as FilterInput[];
  const filtersB = args.group_b_filters as FilterInput[];

  const rowsA = filterRows(dataset, filtersA);
  const rowsB = filterRows(dataset, filtersB);

  const resultA = aggregateOnRows(rowsA, measureKey ?? undefined, aggregation);
  const resultB = aggregateOnRows(rowsB, measureKey ?? undefined, aggregation);

  const diff = resultA.value - resultB.value;
  const pctDiff =
    resultB.value !== 0 ? ((resultA.value - resultB.value) / Math.abs(resultB.value)) * 100 : null;

  const measureLabel = measureKey ? columnLabel(dataset, measureKey) : "baris";

  return {
    result: {
      aggregation,
      measure_column: measureKey,
      measure_label: measureLabel,
      group_a: {
        label: labelA,
        value: resultA.value,
        value_formatted: formatAggValue(aggregation, resultA.value, measureKey ?? undefined, dataset),
        row_count: rowsA.length,
      },
      group_b: {
        label: labelB,
        value: resultB.value,
        value_formatted: formatAggValue(aggregation, resultB.value, measureKey ?? undefined, dataset),
        row_count: rowsB.length,
      },
      difference: diff,
      difference_formatted: formatAggValue(aggregation, diff, measureKey ?? undefined, dataset),
      percent_difference: pctDiff,
      winner: resultA.value > resultB.value ? labelA : resultA.value < resultB.value ? labelB : "seri",
    },
    fact: {
      tool: "compare_groups",
      summary: `${labelA} (${formatAggValue(aggregation, resultA.value, measureKey ?? undefined, dataset)}) vs ${labelB} (${formatAggValue(aggregation, resultB.value, measureKey ?? undefined, dataset)})`,
    },
  };
}

function execColumnStats(
  dataset: AiQueryDataset,
  args: Record<string, unknown>,
  allowSensitive: boolean
) {
  const colRef = args.column as string;
  const colKey = resolveColumn(dataset, colRef);
  if (!colKey) {
    return {
      result: { error: `Kolom tidak ditemukan: ${colRef}` },
      fact: { tool: "column_stats", summary: `Kolom tidak ditemukan` },
    };
  }

  if (!allowSensitive && isSensitive(dataset, colKey)) {
    return {
      result: { error: `Kolom "${columnLabel(dataset, colKey)}" berisi data sensitif (PII) — statistik nilainya tidak boleh ditampilkan.` },
      fact: { tool: "column_stats", summary: `Kolom PII ${columnLabel(dataset, colKey)} ditolak` },
    };
  }

  const col = dataset.columns.find((c) => c.key === colKey)!;
  const filters = args.filters as FilterInput[] | undefined;
  const rows = filterRows(dataset, filters);
  const label = columnLabel(dataset, colKey);

  if (col.type === "number") {
    const nums = rows.map((r) => parseNumber(r[colKey])).filter((n): n is number => n !== null);
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      result: {
        column: colKey,
        column_label: label,
        type: "number",
        row_count: rows.length,
        non_null_count: nums.length,
        null_count: rows.length - nums.length,
        sum,
        avg: nums.length ? sum / nums.length : 0,
        min: nums.length ? Math.min(...nums) : null,
        max: nums.length ? Math.max(...nums) : null,
        sum_formatted: formatCurrency(sum),
        avg_formatted: nums.length ? formatNumber(sum / nums.length) : null,
      },
      fact: {
        tool: "column_stats",
        summary: `${label}: sum=${formatCurrency(sum)}, n=${nums.length}`,
      },
    };
  }

  const dist = aggregateData(rows, colKey, undefined, "count");
  return {
    result: {
      column: colKey,
      column_label: label,
      type: col.type,
      row_count: rows.length,
      unique_count: dist.length,
      top_values: dist.slice(0, 15).map((d) => ({
        value: d.name,
        count: d.value,
        percentage: d.percentage,
      })),
    },
    fact: {
      tool: "column_stats",
      summary: `${label}: ${dist.length} unik, top="${dist[0]?.name ?? "—"}" (${dist[0]?.value ?? 0})`,
    },
  };
}
