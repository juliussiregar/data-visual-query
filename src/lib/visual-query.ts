import type { ColumnMeta, ColumnType } from "./types";

export type QueryOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "in"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "is_empty"
  | "is_not_empty";

/** Daftar kanonik semua operator — sumber tunggal untuk validasi/enum di seluruh app. */
export const QUERY_OPERATORS: QueryOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "in",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "is_empty",
  "is_not_empty",
];

export interface QueryCondition {
  id: string;
  columnKey: string;
  operator: QueryOperator;
  value: string;
  valueTo?: string;
}

export interface QuerySort {
  columnKey: string;
  direction: "asc" | "desc";
}

export interface VisualQuery {
  searchText: string;
  conditions: QueryCondition[];
  sort: QuerySort | null;
}

export const EMPTY_VISUAL_QUERY: VisualQuery = {
  searchText: "",
  conditions: [],
  sort: null,
};

export const OPERATOR_LABELS: Record<QueryOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
  starts_with: "starts with",
  in: "is any of",
  gt: "greater than",
  gte: "at least",
  lt: "less than",
  lte: "at most",
  between: "between",
  is_empty: "is empty",
  is_not_empty: "is not empty",
};

const TEXT_OPS: QueryOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "in",
  "is_empty",
  "is_not_empty",
];

const NUMBER_OPS: QueryOperator[] = [
  "equals",
  "not_equals",
  "in",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "is_empty",
  "is_not_empty",
];

const CATEGORY_OPS: QueryOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "in",
  "is_empty",
  "is_not_empty",
];

export function operatorsForColumn(col: ColumnMeta | undefined): QueryOperator[] {
  if (!col) return TEXT_OPS;
  if (col.type === "number" || col.type === "date") return NUMBER_OPS;
  if (col.type === "category") return CATEGORY_OPS;
  return TEXT_OPS;
}

export function operatorNeedsValue(op: QueryOperator): boolean {
  return op !== "is_empty" && op !== "is_not_empty";
}

export function operatorNeedsSecondValue(op: QueryOperator): boolean {
  return op === "between";
}

export function createCondition(columnKey = ""): QueryCondition {
  return {
    id: crypto.randomUUID(),
    columnKey,
    operator: "equals",
    value: "",
  };
}

function parseNum(value: string): number | null {
  const n = parseFloat(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function matchCondition(
  cell: string,
  op: QueryOperator,
  value: string,
  valueTo?: string
): boolean {
  const raw = cell ?? "";
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const valLower = value.trim().toLowerCase();

  switch (op) {
    case "is_empty":
      return trimmed === "";
    case "is_not_empty":
      return trimmed !== "";
    case "equals":
      return lower === valLower;
    case "not_equals":
      return lower !== valLower;
    case "contains":
      return lower.includes(valLower);
    case "not_contains":
      return !lower.includes(valLower);
    case "starts_with":
      return lower.startsWith(valLower);
    case "in": {
      // value = daftar dipisah koma/semicolon/pipe, mis. "3,4,5" atau "Akad, SP3K"
      const set = valLower
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean);
      return set.includes(lower);
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte":
    case "between": {
      const n = parseNum(trimmed);
      const a = parseNum(value);
      const b = parseNum(valueTo ?? "");
      if (n === null || a === null) return false;
      if (op === "gt") return n > a;
      if (op === "gte") return n >= a;
      if (op === "lt") return n < a;
      if (op === "lte") return n <= a;
      if (op === "between") return b !== null && n >= a && n <= b;
      return false;
    }
    default:
      return true;
  }
}

export function applyVisualQuery(
  rows: Record<string, string>[],
  query: VisualQuery,
  columns: ColumnMeta[]
): Record<string, string>[] {
  let result = rows;

  const q = query.searchText.trim().toLowerCase();
  if (q) {
    result = result.filter((row) =>
      Object.values(row).some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }

  const active = query.conditions.filter((c) => c.columnKey);
  if (active.length > 0) {
    result = result.filter((row) =>
      active.every((cond) => {
        if (!operatorNeedsValue(cond.operator)) {
          return matchCondition(row[cond.columnKey] ?? "", cond.operator, "", "");
        }
        if (!cond.value.trim() && cond.operator !== "is_empty" && cond.operator !== "is_not_empty") {
          return true;
        }
        return matchCondition(
          row[cond.columnKey] ?? "",
          cond.operator,
          cond.value,
          cond.valueTo
        );
      })
    );
  }

  if (query.sort?.columnKey) {
    const { columnKey, direction } = query.sort;
    const col = columns.find((c) => c.key === columnKey);
    const isNumeric = col?.type === "number";
    result = [...result].sort((a, b) => {
      const av = a[columnKey] ?? "";
      const bv = b[columnKey] ?? "";
      let cmp: number;
      if (isNumeric) {
        const an = parseNum(av) ?? 0;
        const bn = parseNum(bv) ?? 0;
        cmp = an - bn;
      } else {
        cmp = av.localeCompare(bv, "id", { numeric: true });
      }
      return direction === "asc" ? cmp : -cmp;
    });
  }

  return result;
}

export function isVisualQueryActive(query: VisualQuery): boolean {
  if (query.searchText.trim()) return true;
  if (query.sort) return true;
  return query.conditions.some(
    (c) =>
      c.columnKey &&
      (!operatorNeedsValue(c.operator) || c.value.trim() || c.operator === "between")
  );
}

export function visualQuerySummary(query: VisualQuery, columns: ColumnMeta[]): string {
  const parts: string[] = [];
  if (query.searchText.trim()) parts.push(`cari "${query.searchText.trim()}"`);
  for (const c of query.conditions) {
    if (!c.columnKey) continue;
    const col = columns.find((x) => x.key === c.columnKey);
    const name = col?.businessLabel ?? col?.label ?? c.columnKey;
    if (!operatorNeedsValue(c.operator)) {
      parts.push(`${name} ${OPERATOR_LABELS[c.operator]}`);
    } else if (c.value.trim()) {
      const val =
        c.operator === "between" && c.valueTo
          ? `${c.value} – ${c.valueTo}`
          : c.value;
      parts.push(`${name} ${OPERATOR_LABELS[c.operator]} ${val}`);
    }
  }
  if (query.sort) {
    const col = columns.find((x) => x.key === query.sort!.columnKey);
    const name = col?.businessLabel ?? col?.label ?? query.sort.columnKey;
    parts.push(`urut ${name} ${query.sort.direction === "asc" ? "naik" : "turun"}`);
  }
  return parts.join(" · ") || "Tanpa filter";
}

export function getColumnOptions(columns: ColumnMeta[]): ColumnMeta[] {
  return columns.filter((c) => c.key.trim() && !c.sensitive);
}

export function getDistinctValues(
  rows: Record<string, string>[],
  columnKey: string,
  limit = 40
): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const v = row[columnKey]?.trim();
    if (v) set.add(v);
    if (set.size >= limit) break;
  }
  return [...set].sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
}

export function defaultOperatorForType(type: ColumnType): QueryOperator {
  if (type === "number" || type === "date") return "gte";
  if (type === "category") return "equals";
  return "contains";
}
