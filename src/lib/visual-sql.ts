import { aggregateData } from "./aggregation";
import { numericColumns } from "./derived-fields";
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
  const measureKey = resolveColumnRef(expr, columns) ?? expr;
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
  return `Kolom "${measureKey}" tidak punya nilai numerik di tabel ini. Periksa rumus atau pilih tabel yang benar.`;
}

function collectMeasureIssues(
  measureSelects: VisualSqlSelectItem[],
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): string | undefined {
  for (const sel of measureSelects) {
    const missing = hintForMissingMeasure(sel.expr, columns);
    if (missing) return missing;
    if (sel.aggregation && sel.aggregation !== "count") {
      const empty = hintForEmptyMeasure(sel.expr, rows, columns);
      if (empty) return empty;
    }
  }
  return undefined;
}

const SELECT_RE =
  /^SELECT\s+(.+?)\s+FROM\s+\*\s*(?:WHERE\s+([\s\S]+?))?\s*(?:GROUP\s+BY\s+(.+?))?\s*(?:ORDER\s+BY\s+(.+?))?\s*(?:LIMIT\s+(\d+))?\s*$/i;

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
    return { expr: "*", alias, aggregation: "count" };
  }
  const avg = expr.match(AVG_RE);
  if (avg) return { expr: avg[1].trim(), alias, aggregation: "avg" };
  const sum = expr.match(SUM_RE);
  if (sum) return { expr: sum[1].trim(), alias, aggregation: "sum" };
  const min = expr.match(MIN_RE);
  if (min) return { expr: min[1].trim(), alias, aggregation: "min" };
  const max = expr.match(MAX_RE);
  if (max) return { expr: max[1].trim(), alias, aggregation: "max" };

  return { expr, alias, isGroupKey: true };
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

export function parseVisualSql(input: string): { query?: VisualSqlQuery; error?: string } {
  const sql = input.trim().replace(/\s+/g, " ");
  const match = sql.match(SELECT_RE);
  if (!match) {
    return {
      error:
        "Format: SELECT kolom, AVG(ukuran) FROM * [WHERE status = 'A'] GROUP BY kolom [ORDER BY avg_ukuran DESC] [LIMIT 12]",
    };
  }

  const [, selectPart, wherePart, groupPart, orderPart, limitPart] = match;
  const selects = splitSelectList(selectPart).map(parseSelectItem);
  const groupBy = groupPart
    ? groupPart.split(",").map((g) => g.trim()).filter(Boolean)
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
  columns: ColumnMeta[] = data.columns
): VisualSqlResult {
  const parsed = parseVisualSql(input);
  if (parsed.error || !parsed.query) {
    return { query: parsed.query ?? { selects: [], groupBy: [], conditions: [] }, summary: "", rows: [], error: parsed.error };
  }

  const query = { ...parsed.query };
  const whereMatch = input.match(/WHERE\s+([\s\S]+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
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

  if (groupKey && measureSelect?.aggregation) {
    const measureKey = resolveColumnRef(measureSelect.expr, columns) ?? measureSelect.expr;
    const agg = measureSelect.aggregation;
    let chartData = aggregateData(
      rows,
      groupKey,
      agg === "count" ? undefined : measureKey,
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

/** Contoh query SQL-like dari kolom tabel aktif (tanpa asumsi nama kolom khusus). */
export function visualSqlExamplesForColumns(columns: ColumnMeta[]): string[] {
  if (!columns.length) return [];

  const group = firstDimension(columns);
  const measure = measureColumn(columns);

  if (group && measure) {
    const examples = [`SELECT ${group}, AVG(${measure}) FROM * GROUP BY ${group}`];

    const numbers = numericColumns(columns).filter((c) => !isIdentifierColumn(c));
    if (numbers.length >= 3) {
      const multi = numbers
        .slice(0, 3)
        .map((c) => `AVG(${c.key})`)
        .join(", ");
      examples.push(`SELECT ${group}, ${multi} FROM * GROUP BY ${group}`);
    }

    const sampleCat = columns.find((c) => c.type === "category" && c.sampleValues?.[0])?.sampleValues?.[0];
    if (sampleCat) {
      examples.push(
        `SELECT ${group}, AVG(${measure}) FROM * WHERE ${group} = '${sampleCat}' GROUP BY ${group}`
      );
    }

    return examples;
  }

  if (measure) {
    return [`SELECT ${group ?? "id"}, SUM(${measure}) FROM * GROUP BY ${group ?? "id"}`];
  }

  return [];
}

export function defaultVisualSqlForColumns(columns: ColumnMeta[]): string {
  const examples = visualSqlExamplesForColumns(columns);
  if (examples[0]) return examples[0];
  return "SELECT COUNT(*) FROM *";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aggExpr(aggregation: VisualSqlAggregation, expr: string): string {
  if (aggregation === "count") return "COUNT(*)";
  return `${aggregation.toUpperCase()}(${expr})`;
}

function selectItemToSql(item: VisualSqlSelectItem): string {
  if (item.aggregation) return aggExpr(item.aggregation, item.expr);
  return item.expr;
}

/** Kolom yang direferensikan di query SQL-like (SELECT, GROUP BY, agregat). */
export function columnKeysInVisualSql(sql: string, columns: ColumnMeta[]): string[] {
  const found: string[] = [];
  for (const col of columns) {
    const key = col.key;
    const patterns = [
      new RegExp(`\\bAVG\\s*\\(\\s*${escapeRegExp(key)}\\s*\\)`, "i"),
      new RegExp(`\\bSUM\\s*\\(\\s*${escapeRegExp(key)}\\s*\\)`, "i"),
      new RegExp(`\\bMIN\\s*\\(\\s*${escapeRegExp(key)}\\s*\\)`, "i"),
      new RegExp(`\\bMAX\\s*\\(\\s*${escapeRegExp(key)}\\s*\\)`, "i"),
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
  const expr = `AVG(${columnKey})`;
  if (new RegExp(`\\bAVG\\s*\\(\\s*${escapeRegExp(columnKey)}\\s*\\)`, "i").test(sql)) {
    return sql;
  }
  const match = sql.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+\*/i);
  if (!match) {
    const group = firstDimension(columns) ?? columnKey;
    return `SELECT ${group}, ${expr} FROM * GROUP BY ${group}`;
  }
  return sql.replace(/^SELECT\s+([\s\S]+?)\s+FROM\s+\*/i, `SELECT $1, ${expr} FROM *`);
}

function removeMeasureFromSql(sql: string, columnKey: string): string {
  let next = sql;
  next = next.replace(
    new RegExp(`,\\s*AVG\\s*\\(\\s*${escapeRegExp(columnKey)}\\s*\\)`, "gi"),
    ""
  );
  next = next.replace(
    new RegExp(`AVG\\s*\\(\\s*${escapeRegExp(columnKey)}\\s*\\)\\s*,\\s*`, "gi"),
    ""
  );
  next = next.replace(
    new RegExp(`\\bAVG\\s*\\(\\s*${escapeRegExp(columnKey)}\\s*\\)`, "gi"),
    ""
  );
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
  tail: ReturnType<typeof preserveSqlTail>
): string {
  let sql = `SELECT ${selectParts.filter(Boolean).join(", ")} FROM *`;
  if (tail.where) sql += ` WHERE ${tail.where}`;
  if (groupBy.length > 0) sql += ` GROUP BY ${groupBy.join(", ")}`;
  if (tail.orderBy) sql += ` ORDER BY ${tail.orderBy}`;
  if (tail.limit) sql += ` LIMIT ${tail.limit}`;
  return sql;
}

function setGroupDimension(sql: string, columnKey: string, columns: ColumnMeta[]): string {
  const parsed = parseVisualSql(sql);
  const tail = preserveSqlTail(sql);

  let measureParts: string[] = [];
  if (parsed.query) {
    measureParts = parsed.query.selects
      .filter((s) => s.aggregation)
      .map((s) => selectItemToSql(s));
  }
  if (measureParts.length === 0) {
    const num = numericColumns(columns).find((c) => c.key !== columnKey);
    measureParts = num ? [`AVG(${num.key})`] : ["COUNT(*)"];
  }

  return rebuildVisualSql([columnKey, ...measureParts], [columnKey], tail);
}

function removeGroupDimension(sql: string, columnKey: string, columns: ColumnMeta[]): string {
  const parsed = parseVisualSql(sql);
  if (!parsed.query) return sql;

  const tail = preserveSqlTail(sql);
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
          ? [`AVG(${numericColumns(columns)[0].key})`]
          : ["COUNT(*)"];
    let sql = `SELECT ${parts.join(", ")} FROM *`;
    if (tail.where) sql += ` WHERE ${tail.where}`;
    if (tail.orderBy) sql += ` ORDER BY ${tail.orderBy}`;
    if (tail.limit) sql += ` LIMIT ${tail.limit}`;
    return sql;
  }

  const nextGroup = groupKeys[0];
  const dims = parsed.query.selects
    .filter((s) => !s.aggregation && resolveColumnRef(s.expr, columns) !== columnKey)
    .map((s) => s.expr);
  const selectParts = [dims[0] ?? nextGroup, ...measureParts];

  return rebuildVisualSql(selectParts, groupKeys, tail);
}

/** Tambah/hapus kolom dari query dengan toggle chip di sidebar. */
export function toggleVisualSqlColumn(
  sql: string,
  columnKey: string,
  columns: ColumnMeta[],
  select: boolean
): string {
  const col = columns.find((c) => c.key === columnKey);
  if (!col) return sql;

  const referenced = columnKeysInVisualSql(sql, columns).includes(columnKey);
  if (select === referenced) return sql;

  if (isMeasureColumn(columnKey, columns)) {
    return select ? addMeasureToSql(sql, columnKey, columns) : removeMeasureFromSql(sql, columnKey);
  }

  return select
    ? setGroupDimension(sql, columnKey, columns)
    : removeGroupDimension(sql, columnKey, columns);
}
