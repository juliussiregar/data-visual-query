import { aggregateData } from "./aggregation";
import { formatColumnRefForFormula, numericColumns } from "./derived-fields";
import { parseNumber, roundMetricValue, isIdentifierColumn, inferColumnIsCurrency } from "./format";
import { resolveColumnRef } from "./formula-engine";
import { applyVisualQuery, type QueryCondition, type VisualQuery } from "./visual-query";
import type { ChartConfig, ChartDataPoint, ChartSeriesSpec, ChartType, ColumnMeta, SheetData } from "./types";

export type VisualSqlAggregation = "count" | "sum" | "avg" | "min" | "max";

export interface VisualSqlSelectItem {
  expr: string;
  alias: string;
  aggregation?: VisualSqlAggregation;
  isGroupKey?: boolean;
}

export interface VisualSqlQuery {
  selects: VisualSqlSelectItem[];
  groupBy: string[];
  orderBy?: { column: string; direction: "asc" | "desc" };
  limit?: number;
  conditions: QueryCondition[];
}

export interface VisualSqlResult {
  query: VisualSqlQuery;
  summary: string;
  rows: Record<string, string | number>[];
  chart?: {
    categoryKey: string;
    measureKey: string;
    aggregation: VisualSqlAggregation;
    data: ChartDataPoint[];
    series?: ChartSeriesSpec[];
    multiSeriesData?: Array<Record<string, string | number> & { name: string }>;
  };
  error?: string;
}

function rowsHaveMeasure(rows: Record<string, string>[], measureKey: string): boolean {
  return rows.some((row) => parseNumber(row[measureKey]) !== null);
}

function hintForMissingMeasure(expr: string, columns: ColumnMeta[]): string | undefined {
  if (expr === "*") return undefined;
  const measureKey = resolveColumnRef(bareSqlIdent(expr), columns) ?? bareSqlIdent(expr);
  if (columns.some((c) => c.key === measureKey)) return undefined;
  const numeric = numericColumns(columns)
    .filter((c) => !isIdentifierColumn(c))
    .map((c) => c.key)
    .slice(0, 5);
  const numericHint = numeric.length ? ` Kolom numerik di tabel ini: ${numeric.join(", ")}.` : "";
  return `Kolom "${measureKey}" tidak ada di tabel aktif.${numericHint} Ganti nama kolom, pilih tabel lain (sidebar kanan), atau buat kolom custom lewat Edit Widget → Kolom dihitung.`;
}

function hintForEmptyMeasure(
  expr: string,
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): string | undefined {
  const measureKey = resolveColumnRef(expr, columns) ?? expr;
  if (rowsHaveMeasure(rows, measureKey)) return undefined;
  if (!columns.some((c) => c.key === measureKey)) return undefined;
  return `Kolom "${measureKey}" ada di schema tapi kosong di tabel ini — rumus kolom custom mungkin butuh tabel lain (mis. student_grades, bukan students).`;
}

function collectMeasureIssues(
  measureSelects: VisualSqlSelectItem[],
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): string | undefined {
  for (const sel of measureSelects) {
    if (sel.aggregation === "count" && sel.expr === "*") continue;
    const missing = hintForMissingMeasure(sel.expr, columns);
    if (missing) return missing;
    if (sel.aggregation && sel.aggregation !== "count") {
      const empty = hintForEmptyMeasure(sel.expr, rows, columns);
      if (empty) return empty;
    }
  }
  return undefined;
}

const BRACKET_IDENT = String.raw`\[[^\]]+\]`;
const QUOTED_IDENT = String.raw`"[^"]+"`;
const WORD_IDENT = String.raw`[\w][\w.]*(?:__[\w][\w.]*)?`;
const SQL_IDENT_PATTERN = `(?:${BRACKET_IDENT}|${QUOTED_IDENT}|${WORD_IDENT})`;
const TABLE_REF_PATTERN = `(?:${SQL_IDENT_PATTERN}|\\*)`;

const SELECT_RE = new RegExp(
  `^SELECT\\s+(.+?)\\s+FROM\\s+(${TABLE_REF_PATTERN})\\s*(?:WHERE\\s+([\\s\\S]+?))?\\s*(?:GROUP\\s+BY\\s+(.+?))?\\s*(?:ORDER\\s+BY\\s+(.+?))?\\s*(?:LIMIT\\s+(\\d+))?\\s*$`,
  "i"
);

/** Lepas bracket/kutip berlapis → nama kolom mentah. */
function bareSqlIdent(raw: string): string {
  let inner = raw.trim();
  while (true) {
    const bracket = inner.match(/^\[(.+)\]$/);
    if (bracket) {
      inner = bracket[1].trim();
      continue;
    }
    const quoted = inner.match(/^"(.+)"$/);
    if (quoted) {
      inner = quoted[1].trim();
      continue;
    }
    break;
  }
  return inner;
}

/** Bungkus nama kolom/tabel yang ber-spasi atau karakter khusus, mis. [math score]. */
export function formatVisualSqlRef(key: string): string {
  return formatColumnRefForFormula(bareSqlIdent(key));
}

function unquoteSqlIdent(raw: string): string {
  return bareSqlIdent(raw);
}

/** Klausul FROM untuk query editor — pakai nama tabel nyata, bukan bintang. */
export function visualSqlFromClause(tableRef?: string): string {
  const trimmed = tableRef?.trim();
  return trimmed ? `FROM ${formatVisualSqlRef(trimmed)}` : "FROM *";
}

export function parseVisualSqlTableRef(sql: string): string | null {
  const match = sql.trim().match(new RegExp(`\\bFROM\\s+(${TABLE_REF_PATTERN})`, "i"));
  if (!match) return null;
  const raw = match[1];
  return raw === "*" ? null : unquoteSqlIdent(raw);
}

export function withVisualSqlTable(sql: string, tableRef: string): string {
  const ref = tableRef.trim();
  if (!ref) return sql;
  const fromClause = visualSqlFromClause(ref);
  if (/\bFROM\s+/i.test(sql)) {
    return sql.replace(new RegExp(`\\bFROM\\s+${TABLE_REF_PATTERN}`, "i"), fromClause);
  }
  return `${sql.trim()} ${fromClause}`.trim();
}

const AVG_RE = /^AVG\s*\(\s*(.+?)\s*\)$/i;
const SUM_RE = /^SUM\s*\(\s*(.+?)\s*\)$/i;
const MIN_RE = /^MIN\s*\(\s*(.+?)\s*\)$/i;
const MAX_RE = /^MAX\s*\(\s*(.+?)\s*\)$/i;
const COUNT_RE = /^COUNT\s*\(\s*\*\s*\)$/i;

function splitSelectList(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of input) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseSelectItem(raw: string): VisualSqlSelectItem {
  const item = raw.trim();
  const aliasMatch = item.match(/^(.+?)\s+AS\s+(\w+)$/i);
  const expr = (aliasMatch ? aliasMatch[1] : item).trim();
  const alias = aliasMatch ? aliasMatch[2] : expr.replace(/[^\w]/g, "_").toLowerCase() || "col";

  if (COUNT_RE.test(expr)) {
    return { expr: "*", alias: aliasMatch ? aliasMatch[2] : "count", aggregation: "count" };
  }
  const avg = expr.match(AVG_RE);
  if (avg) return { expr: bareSqlIdent(avg[1].trim()), alias, aggregation: "avg" };
  const sum = expr.match(SUM_RE);
  if (sum) return { expr: bareSqlIdent(sum[1].trim()), alias, aggregation: "sum" };
  const min = expr.match(MIN_RE);
  if (min) return { expr: bareSqlIdent(min[1].trim()), alias, aggregation: "min" };
  const max = expr.match(MAX_RE);
  if (max) return { expr: bareSqlIdent(max[1].trim()), alias, aggregation: "max" };

  return { expr: bareSqlIdent(expr), alias, isGroupKey: true };
}

function parseWhereClause(where: string, columns: ColumnMeta[]): QueryCondition[] {
  const conditions: QueryCondition[] = [];
  const parts = where.split(/\s+AND\s+/i);
  for (const part of parts) {
    const m = part.trim().match(/^(.+?)\s*(=|>=|<=|>|<|!=)\s*(.+)$/);
    if (!m) continue;
    const colRef = m[1].trim();
    const op = m[2];
    const val = m[3].trim().replace(/^['"]|['"]$/g, "");
    const key = resolveColumnRef(colRef, columns);
    if (!key) continue;
    const operator =
      op === "="
        ? "equals"
        : op === "!="
          ? "not_equals"
          : op === ">"
            ? "gt"
            : op === ">="
              ? "gte"
              : op === "<"
                ? "lt"
                : "lte";
    conditions.push({
      id: `sql_${key}_${conditions.length}`,
      columnKey: key,
      operator,
      value: val,
    });
  }
  return conditions;
}

/** Perbaiki query lama tanpa bracket untuk kolom/tabel ber-spasi. */
export function normalizeVisualSql(input: string, columns: ColumnMeta[], tableRef?: string): string {
  let out = input.trim().replace(/\s+/g, " ");
  if (!out) return out;

  if (tableRef?.includes(" ")) {
    const formatted = formatVisualSqlRef(tableRef);
    if (!out.includes(`FROM ${formatted}`)) {
      out = out.replace(
        /\bFROM\s+(.+?)(?=\s+(?:WHERE|GROUP\s+BY|ORDER\s+BY|LIMIT)\b|$)/i,
        `FROM ${formatted}`
      );
    }
  }

  const keys = [...columns]
    .map((c) => c.key)
    .filter((k) => k && (k.includes(" ") || !/^[A-Za-z_][\w]*$/.test(k)))
    .sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const ref = formatVisualSqlRef(key);
    for (const fn of ["AVG", "SUM", "MIN", "MAX"]) {
      out = out.replace(
        new RegExp(`\\b${fn}\\s*\\(\\s*\\[+${escapeRegExp(key)}\\]+\\s*\\)`, "gi"),
        `${fn}(${ref})`
      );
      out = out.replace(
        new RegExp(`\\b${fn}\\s*\\(\\s*${escapeRegExp(key)}\\s*\\)`, "gi"),
        `${fn}(${ref})`
      );
    }
    out = out.replace(
      new RegExp(`(?<=[,\\s])${escapeRegExp(key)}(?=\\s*(?:,|GROUP\\s+BY|WHERE|ORDER\\s+BY|LIMIT|$))`, "gi"),
      ref
    );
    out = out.replace(
      new RegExp(`\\bGROUP\\s+BY\\s+${escapeRegExp(key)}(?=\\s*(?:,|ORDER\\s+BY|LIMIT|$))`, "gi"),
      `GROUP BY ${ref}`
    );
  }

  return out;
}

export function parseVisualSql(input: string): { query?: VisualSqlQuery; error?: string } {
  const sql = input.trim().replace(/\s+/g, " ");
  const match = sql.match(SELECT_RE);
  if (!match) {
    return {
      error:
        "Format: SELECT kolom, AVG([ukuran]) FROM [nama tabel] [WHERE status = 'A'] GROUP BY kolom [ORDER BY avg_ukuran DESC] [LIMIT 12]",
    };
  }

  const [, selectPart, , groupPart, orderPart, limitPart] = match;
  const selects = splitSelectList(selectPart).map(parseSelectItem);
  const groupBy = groupPart
    ? splitSelectList(groupPart).map((g) => unquoteSqlIdent(g.trim())).filter(Boolean)
    : selects.filter((s) => s.isGroupKey).map((s) => s.expr);

  let orderBy: VisualSqlQuery["orderBy"];
  if (orderPart) {
    const om = orderPart.trim().match(/^(\w+)(?:\s+(ASC|DESC))?$/i);
    if (om) {
      orderBy = { column: om[1], direction: om[2]?.toUpperCase() === "ASC" ? "asc" : "desc" };
    }
  }

  return {
    query: {
      selects,
      groupBy,
      orderBy,
      limit: limitPart ? parseInt(limitPart, 10) : undefined,
      conditions: [],
    },
  };
}

export function executeVisualSql(
  data: SheetData,
  input: string,
  columns: ColumnMeta[] = data.columns,
  activeTableRef?: string
): VisualSqlResult {
  const tableRef =
    activeTableRef ??
    (data.dataset?.name && data.dataset.name !== "default" ? data.dataset.name : undefined) ??
    parseVisualSqlTableRef(input) ??
    undefined;
  const sql = normalizeVisualSql(input, columns, tableRef);
  const parsed = parseVisualSql(sql);
  if (parsed.error || !parsed.query) {
    return { query: parsed.query ?? { selects: [], groupBy: [], conditions: [] }, summary: "", rows: [], error: parsed.error };
  }

  const query = { ...parsed.query };
  const whereMatch = sql.match(/WHERE\s+([\s\S]+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
  if (whereMatch) {
    query.conditions = parseWhereClause(whereMatch[1], columns);
  }

  let rows = data.rows;
  if (query.conditions.length > 0) {
    const vq: VisualQuery = { searchText: "", conditions: query.conditions, sort: null };
    rows = applyVisualQuery(rows, vq, columns);
  }

  const groupKey = query.groupBy[0]
    ? resolveColumnRef(query.groupBy[0], columns) ?? query.groupBy[0]
    : null;

  const measureSelects = query.selects.filter((s) => s.aggregation);

  const measureIssue = collectMeasureIssues(measureSelects, rows, columns);
  if (measureIssue) {
    return { query, summary: "", rows: [], error: measureIssue };
  }

  if (groupKey && measureSelects.length > 1) {
    const series: ChartSeriesSpec[] = [];
    const byName = new Map<string, Record<string, number>>();
    const categoryOrder: string[] = [];

    for (const sel of measureSelects) {
      const measureKey = resolveColumnRef(sel.expr, columns) ?? sel.expr;
      const agg = sel.aggregation!;
      const measureCol = columns.find((c) => c.key === measureKey);
      series.push({
        key: sel.alias,
        label: `${agg.toUpperCase()}(${sel.expr})`,
        aggregation: agg === "count" ? "count" : agg,
        valueFormat: measureCol && inferColumnIsCurrency(measureCol) ? "currency" : "number",
      });

      const points = aggregateData(
        rows,
        groupKey,
        agg === "count" ? undefined : measureKey,
        agg === "count" ? "count" : agg
      );

      for (const p of points) {
        if (!byName.has(p.name)) {
          byName.set(p.name, {});
          categoryOrder.push(p.name);
        }
        byName.get(p.name)![sel.alias] = roundMetricValue(p.value);
      }
    }

    let multiSeriesData: Array<Record<string, string | number> & { name: string }> =
      categoryOrder.map((name) => ({
        name,
        ...byName.get(name)!,
      }));

    if (query.orderBy) {
      const orderKey = query.orderBy.column;
      const dir = query.orderBy.direction === "asc" ? 1 : -1;
      multiSeriesData = [...multiSeriesData].sort((a, b) => {
        const av = orderKey === groupKey ? a.name : Number(a[orderKey] ?? 0);
        const bv = orderKey === groupKey ? b.name : Number(b[orderKey] ?? 0);
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv), "id", { numeric: true }) * dir;
      });
    } else {
      const firstKey = series[0]?.key;
      multiSeriesData = [...multiSeriesData].sort((a, b) =>
        firstKey ? Number(b[firstKey] ?? 0) - Number(a[firstKey] ?? 0) : 0
      );
    }

    const limit = query.limit ?? 12;
    multiSeriesData = multiSeriesData.slice(0, limit);

    const resultRows = multiSeriesData.map((row) => {
      const out: Record<string, string | number> = { [groupKey]: row.name };
      for (const s of series) {
        out[s.key] = row[s.key] ?? "";
      }
      return out;
    });

    const first = measureSelects[0];
    const firstKey = resolveColumnRef(first.expr, columns) ?? first.expr;
    const summary = series.map((s) => s.label).join(" · ");

    return {
      query,
      summary: `${summary} per ${groupKey}`,
      rows: resultRows,
      chart: {
        categoryKey: groupKey,
        measureKey: firstKey,
        aggregation: first.aggregation!,
        data: [],
        series,
        multiSeriesData,
      },
    };
  }

  const measureSelect = measureSelects[0];

  if (!groupKey && measureSelect?.aggregation === "count" && measureSelect.expr === "*") {
    const total = rows.length;
    const alias = measureSelect.alias || "count";
    const chartPoint = { name: "Total", value: total };
    return {
      query,
      summary: `COUNT(*) = ${total.toLocaleString("id-ID")}`,
      rows: [{ [alias]: total }],
      chart: {
        categoryKey: "_total",
        measureKey: "*",
        aggregation: "count",
        data: [chartPoint],
      },
    };
  }

  if (groupKey && measureSelect?.aggregation) {
    const measureKey =
      measureSelect.aggregation === "count" && measureSelect.expr === "*"
        ? "*"
        : resolveColumnRef(measureSelect.expr, columns) ?? measureSelect.expr;
    const agg = measureSelect.aggregation;
    let chartData = aggregateData(
      rows,
      groupKey,
      agg === "count" ? undefined : measureKey === "*" ? undefined : measureKey,
      agg === "count" ? "count" : agg
    );

    if (query.orderBy) {
      const dir = query.orderBy.direction === "asc" ? 1 : -1;
      chartData = [...chartData].sort((a, b) => (a.value - b.value) * dir);
    } else {
      chartData = [...chartData].sort((a, b) => b.value - a.value);
    }

    const limit = query.limit ?? 12;
    chartData = chartData.slice(0, limit);

    const resultRows = chartData.map((p) => ({
      [groupKey]: p.name,
      [measureSelect.alias]: roundMetricValue(p.value),
    }));

    return {
      query,
      summary: `${agg.toUpperCase()}(${measureSelect.expr}) per ${groupKey}`,
      rows: resultRows,
      chart: {
        categoryKey: groupKey,
        measureKey,
        aggregation: agg,
        data: chartData,
      },
    };
  }

  const resultRows = rows.slice(0, query.limit ?? 50).map((row) => {
    const out: Record<string, string | number> = {};
    for (const sel of query.selects) {
      if (sel.aggregation) continue;
      const key = resolveColumnRef(sel.expr, columns) ?? sel.expr;
      const raw = row[key] ?? "";
      const num = parseNumber(raw);
      out[sel.alias] = num !== null ? roundMetricValue(num) : raw;
    }
    return out;
  });

  return {
    query,
    summary: `${resultRows.length} baris`,
    rows: resultRows,
  };
}

/** Bangun ChartConfig langsung dari hasil query (sudah termasuk filter WHERE). */
export function chartConfigFromVisualSqlResult(
  result: VisualSqlResult,
  columns: ColumnMeta[],
  chartType: ChartType,
  chartId = "query_preview"
): ChartConfig | null {
  if (!result.chart) return null;
  const { categoryKey, measureKey, aggregation, data, series, multiSeriesData } = result.chart;
  const measureCol = columns.find((c) => c.key === measureKey);
  const catLabel = columns.find((c) => c.key === categoryKey)?.label ?? categoryKey;

  const pieTypes: ChartType[] = ["pie", "donut", "radial", "treemap"];
  const effectiveType =
    series && series.length > 1 && pieTypes.includes(chartType) ? "bar" : chartType;

  return {
    id: chartId,
    title: result.summary,
    type: effectiveType,
    categoryKey,
    valueKey: measureKey,
    aggregation,
    data,
    series,
    multiSeriesData,
    description:
      series && series.length > 1
        ? `${series.length} metrik · ${catLabel}`
        : `${aggregation.toUpperCase()} · ${catLabel}`,
    valueFormat: measureCol && inferColumnIsCurrency(measureCol) ? "currency" : "number",
  };
}

export const VISUAL_SQL_EXAMPLES = [
  "SELECT region, AVG(nilai) FROM * GROUP BY region",
  "SELECT kategori, AVG(skor) FROM * GROUP BY kategori",
];

function findColumn(columns: ColumnMeta[], ...names: string[]): string | null {
  for (const name of names) {
    const col = columns.find((c) => c.key.toLowerCase() === name.toLowerCase());
    if (col) return col.key;
  }
  return null;
}

function measureColumn(columns: ColumnMeta[]): string | null {
  const numbers = numericColumns(columns);
  const metric = numbers.find((c) => !isIdentifierColumn(c));
  return metric?.key ?? numbers[0]?.key ?? null;
}

function firstDimension(columns: ColumnMeta[]): string | null {
  const preferred = findColumn(
    columns,
    "region",
    "zone",
    "gender",
    "jurusan",
    "metric",
    "device_code",
    "category",
    "kelas",
    "status"
  );
  if (preferred) return preferred;

  const dim = columns.find((c) => {
    if (c.type !== "category" && c.semanticRole !== "dimension") return false;
    const key = c.key.toLowerCase();
    if (key === "id") return false;
    return true;
  });
  if (dim) return dim.key;

  const textDim = columns.find(
    (c) =>
      (c.type === "category" || c.type === "text") &&
      c.key !== "id" &&
      !isIdentifierColumn(c)
  );
  if (textDim) return textDim.key;

  const fk = columns.find((c) => {
    const key = c.key.toLowerCase();
    return key.endsWith("_id") && key !== "id";
  });
  return fk?.key ?? null;
}

/** Kolom kategori/teks untuk preview baris (bukan agregasi). */
function previewDimensionColumns(columns: ColumnMeta[], max = 3): string[] {
  return columns
    .filter(
      (c) =>
        c.key.trim() &&
        c.key !== "id" &&
        !isIdentifierColumn(c) &&
        (c.type === "category" || c.type === "text" || c.semanticRole === "dimension")
    )
    .slice(0, max)
    .map((c) => c.key);
}

/** Contoh query SQL-like dari kolom tabel aktif (tanpa asumsi nama kolom khusus). */
export function visualSqlExamplesForColumns(
  columns: ColumnMeta[],
  tableRef?: string
): string[] {
  if (!columns.length) return [];

  const from = visualSqlFromClause(tableRef);
  const group = firstDimension(columns);
  const measure = measureColumn(columns);
  const preview = previewDimensionColumns(columns);

  const ref = (key: string) => formatVisualSqlRef(key);

  if (group && measure) {
    const examples = [`SELECT ${ref(group)}, AVG(${ref(measure)}) ${from} GROUP BY ${ref(group)}`];

    const numbers = numericColumns(columns).filter((c) => !isIdentifierColumn(c));
    if (numbers.length >= 3) {
      const multi = numbers
        .slice(0, 3)
        .map((c) => `AVG(${ref(c.key)})`)
        .join(", ");
      examples.push(`SELECT ${ref(group)}, ${multi} ${from} GROUP BY ${ref(group)}`);
    }

    const sampleCat = columns.find((c) => c.type === "category" && c.sampleValues?.[0])?.sampleValues?.[0];
    if (sampleCat) {
      examples.push(
        `SELECT ${ref(group)}, AVG(${ref(measure)}) ${from} WHERE ${ref(group)} = '${sampleCat}' GROUP BY ${ref(group)}`
      );
    }

    return examples;
  }

  if (group && !measure) {
    const examples: string[] = [];
    if (preview.length > 0) {
      examples.push(`SELECT ${preview.map(ref).join(", ")} ${from}`);
    }
    examples.push(`SELECT ${ref(group)}, COUNT(*) ${from} GROUP BY ${ref(group)}`);
    return examples;
  }

  if (measure) {
    const dim = group ?? "id";
    return [`SELECT ${ref(dim)}, SUM(${ref(measure)}) ${from} GROUP BY ${ref(dim)}`];
  }

  if (preview.length > 0) {
    return [`SELECT ${preview.map(ref).join(", ")} ${from}`];
  }

  return [`SELECT COUNT(*) ${from}`];
}

export function defaultVisualSqlForColumns(columns: ColumnMeta[], tableRef?: string): string {
  return visualSqlExamplesForColumns(columns, tableRef)[0] ?? `SELECT COUNT(*) ${visualSqlFromClause(tableRef)}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function avgMeasureRegex(columnKey: string, flags = "i"): RegExp {
  const bare = escapeRegExp(bareSqlIdent(columnKey));
  return new RegExp(`AVG\\s*\\(\\s*\\[*${bare}\\]*\\s*\\)`, flags);
}

function dimensionRefRegex(columnKey: string, flags = "i"): RegExp {
  const bare = escapeRegExp(bareSqlIdent(columnKey));
  const ref = escapeRegExp(formatVisualSqlRef(columnKey));
  return new RegExp(`(?:${ref}|\\[*${bare}\\]*)`, flags);
}

function aggExpr(aggregation: VisualSqlAggregation, expr: string): string {
  if (aggregation === "count") return "COUNT(*)";
  return `${aggregation.toUpperCase()}(${expr})`;
}

function selectItemToSql(item: VisualSqlSelectItem): string {
  if (item.aggregation) {
    if (item.aggregation === "count" && item.expr === "*") return "COUNT(*)";
    return aggExpr(item.aggregation, formatVisualSqlRef(item.expr));
  }
  return formatVisualSqlRef(item.expr);
}

/** Kolom yang direferensikan di query SQL-like (SELECT, GROUP BY, agregat). */
export function columnKeysInVisualSql(sql: string, columns: ColumnMeta[]): string[] {
  const found: string[] = [];
  for (const col of columns) {
    const key = col.key;
    const patterns = [
      avgMeasureRegex(key),
      new RegExp(`\\bSUM\\s*\\(\\s*\\[*${escapeRegExp(bareSqlIdent(key))}\\]*\\s*\\)`, "i"),
      new RegExp(`\\bMIN\\s*\\(\\s*\\[*${escapeRegExp(bareSqlIdent(key))}\\]*\\s*\\)`, "i"),
      new RegExp(`\\bMAX\\s*\\(\\s*\\[*${escapeRegExp(bareSqlIdent(key))}\\]*\\s*\\)`, "i"),
      dimensionRefRegex(key),
      new RegExp(`\\bAVG\\s*\\(\\s*${escapeRegExp(key)}\\s*\\)`, "i"),
      new RegExp(`\\b${escapeRegExp(key)}\\b`),
    ];
    if (patterns.some((re) => re.test(sql))) found.push(key);
  }
  return found;
}

function isMeasureColumn(columnKey: string, columns: ColumnMeta[]): boolean {
  return numericColumns(columns).some((c) => c.key === columnKey);
}

function addMeasureToSql(sql: string, columnKey: string, columns: ColumnMeta[]): string {
  const ref = formatVisualSqlRef(columnKey);
  const expr = `AVG(${ref})`;
  if (avgMeasureRegex(columnKey).test(sql)) {
    return sql;
  }
  const tableRef = parseVisualSqlTableRef(sql);
  const from = visualSqlFromClause(tableRef ?? undefined);
  const fromTokenMatch = sql.match(new RegExp(`\\bFROM\\s+(${TABLE_REF_PATTERN})`, "i"));
  const fromToken = fromTokenMatch?.[1] ?? (tableRef ? formatVisualSqlRef(tableRef) : "*");
  const match = sql.match(
    new RegExp(`^SELECT\\s+([\\s\\S]+?)\\s+FROM\\s+${TABLE_REF_PATTERN}`, "i")
  );
  if (!match) {
    const group = firstDimension(columns) ?? columnKey;
    return `SELECT ${formatVisualSqlRef(group)}, ${expr} ${from} GROUP BY ${formatVisualSqlRef(group)}`;
  }
  return sql.replace(
    new RegExp(`^SELECT\\s+([\\s\\S]+?)\\s+FROM\\s+${TABLE_REF_PATTERN}`, "i"),
    `SELECT $1, ${expr} FROM ${fromToken}`
  );
}

function removeMeasureFromSql(sql: string, columnKey: string): string {
  const avg = avgMeasureRegex(columnKey, "gi");
  let next = sql;
  next = next.replace(new RegExp(`,\\s*${avg.source}`, avg.flags), "");
  next = next.replace(new RegExp(`${avg.source}\\s*,\\s*`, avg.flags), "");
  next = next.replace(avg, "");
  next = next.replace(/SELECT\s+,/i, "SELECT ");
  next = next.replace(/,\s*,/g, ",");
  return next.trim();
}

function preserveSqlTail(sql: string): {
  where?: string;
  orderBy?: string;
  limit?: string;
} {
  const whereMatch = sql.match(/\sWHERE\s+([\s\S]+?)(?:\sGROUP\s+BY|\sORDER\s+BY|\sLIMIT|$)/i);
  const orderMatch = sql.match(/\sORDER\s+BY\s+([\s\S]+?)(?:\sLIMIT|$)/i);
  const limitMatch = sql.match(/\sLIMIT\s+(\d+)/i);
  return {
    where: whereMatch?.[1]?.trim(),
    orderBy: orderMatch?.[1]?.trim(),
    limit: limitMatch?.[1],
  };
}

function rebuildVisualSql(
  selectParts: string[],
  groupBy: string[],
  tail: ReturnType<typeof preserveSqlTail>,
  tableRef?: string | null
): string {
  const from = visualSqlFromClause(tableRef ?? undefined);
  let sql = `SELECT ${selectParts.filter(Boolean).join(", ")} ${from}`;
  if (tail.where) sql += ` WHERE ${tail.where}`;
  if (groupBy.length > 0) sql += ` GROUP BY ${groupBy.join(", ")}`;
  if (tail.orderBy) sql += ` ORDER BY ${tail.orderBy}`;
  if (tail.limit) sql += ` LIMIT ${tail.limit}`;
  return sql;
}

function setGroupDimension(sql: string, columnKey: string, columns: ColumnMeta[]): string {
  const parsed = parseVisualSql(sql);
  const tail = preserveSqlTail(sql);
  const tableRef = parseVisualSqlTableRef(sql);

  let measureParts: string[] = [];
  if (parsed.query) {
    measureParts = parsed.query.selects
      .filter((s) => s.aggregation)
      .map((s) => selectItemToSql(s));
  }
  if (measureParts.length === 0) {
    const num = numericColumns(columns).find((c) => c.key !== columnKey);
    measureParts = num ? [`AVG(${formatVisualSqlRef(num.key)})`] : ["COUNT(*)"];
  }

  const dimRef = formatVisualSqlRef(columnKey);
  return rebuildVisualSql([dimRef, ...measureParts], [dimRef], tail, tableRef);
}

function removeGroupDimension(sql: string, columnKey: string, columns: ColumnMeta[]): string {
  const parsed = parseVisualSql(sql);
  if (!parsed.query) return sql;

  const tail = preserveSqlTail(sql);
  const tableRef = parseVisualSqlTableRef(sql);
  const groupKeys = parsed.query.groupBy.filter(
    (g) => resolveColumnRef(g, columns) !== columnKey && g !== columnKey
  );
  const measureParts = parsed.query.selects
    .filter((s) => s.aggregation)
    .map((s) => selectItemToSql(s));

  if (groupKeys.length === 0) {
    const parts =
      measureParts.length > 0
        ? measureParts
        : numericColumns(columns).length > 0
          ? [`AVG(${formatVisualSqlRef(numericColumns(columns)[0].key)})`]
          : ["COUNT(*)"];
    const from = visualSqlFromClause(tableRef ?? undefined);
    let sql = `SELECT ${parts.join(", ")} ${from}`;
    if (tail.where) sql += ` WHERE ${tail.where}`;
    if (tail.orderBy) sql += ` ORDER BY ${tail.orderBy}`;
    if (tail.limit) sql += ` LIMIT ${tail.limit}`;
    return sql;
  }

  const nextGroup = groupKeys[0];
  const dims = parsed.query.selects
    .filter((s) => !s.aggregation && resolveColumnRef(s.expr, columns) !== columnKey)
    .map((s) => formatVisualSqlRef(s.expr));
  const selectParts = [dims[0] ?? formatVisualSqlRef(nextGroup), ...measureParts];

  return rebuildVisualSql(selectParts, groupKeys, tail, tableRef);
}

/** Tambah/hapus kolom dari query dengan toggle chip di sidebar. */
export function toggleVisualSqlColumn(
  sql: string,
  columnKey: string,
  columns: ColumnMeta[],
  select: boolean,
  activeTableRef?: string
): string {
  const col = columns.find((c) => c.key === columnKey);
  if (!col) return sql;

  const next = normalizeVisualSql(sql, columns, activeTableRef);
  const referenced = columnKeysInVisualSql(next, columns).includes(columnKey);
  if (select === referenced) return next;

  if (isMeasureColumn(columnKey, columns)) {
    return select
      ? addMeasureToSql(next, columnKey, columns)
      : removeMeasureFromSql(next, columnKey);
  }

  return select
    ? setGroupDimension(next, columnKey, columns)
    : removeGroupDimension(next, columnKey, columns);
}
