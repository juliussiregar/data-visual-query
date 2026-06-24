import { getMockTable } from "./connectors/mock-db";

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, string>[];
  rowCount: number;
  truncated: boolean;
  executionMs: number;
}

export interface SqlQueryOptions {
  maxRows?: number;
  timeoutMs?: number;
}

const DEFAULT_MAX_ROWS = 100;
const DEFAULT_TIMEOUT_MS = 5000;

const FORBIDDEN = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXEC|EXECUTE)\b/i;

export function validateReadOnlySql(sql: string): string | null {
  const trimmed = sql.trim();
  if (!trimmed) return "Query kosong";
  if (!/^SELECT\b/i.test(trimmed)) return "Hanya perintah SELECT yang diizinkan";
  if (FORBIDDEN.test(trimmed)) return "Perintah tulis/DDL tidak diizinkan";
  if (trimmed.includes(";") && trimmed.indexOf(";") < trimmed.length - 1) {
    return "Hanya satu pernyataan SELECT per request";
  }
  return null;
}

export function executeReadOnlySql(
  sql: string,
  options: SqlQueryOptions = {}
): SqlQueryResult {
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const start = Date.now();

  const validationError = validateReadOnlySql(sql);
  if (validationError) throw new Error(validationError);

  const parsed = parseSimpleSelect(sql);
  const table = getMockTable(parsed.table);
  if (!table) throw new Error(`Tabel tidak ditemukan: ${parsed.table}`);

  let rows = [...table.rows];

  if (parsed.where) {
    const { column, value } = parsed.where;
    rows = rows.filter((r) => (r[column] ?? "").trim() === value);
  }

  const columns =
    parsed.columns[0] === "*"
      ? table.columns
      : parsed.columns.filter((c) => table.columns.includes(c));

  if (Date.now() - start > timeoutMs) {
    throw new Error(`Query timeout (${timeoutMs}ms)`);
  }

  const sliced = rows.slice(0, maxRows);
  const projected = sliced.map((row) => {
    const out: Record<string, string> = {};
    for (const col of columns) out[col] = row[col] ?? "";
    return out;
  });

  return {
    columns,
    rows: projected,
    rowCount: projected.length,
    truncated: rows.length > maxRows,
    executionMs: Date.now() - start,
  };
}

function parseSimpleSelect(sql: string): {
  columns: string[];
  table: string;
  where?: { column: string; value: string };
  limit?: number;
} {
  const normalized = sql.replace(/\s+/g, " ").trim();
  const match = normalized.match(
    /^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(\w+)\s*=\s*'([^']*)')?(?:\s+LIMIT\s+(\d+))?$/i
  );
  if (!match) {
    throw new Error(
      "Format didukung: SELECT col1, col2 FROM tabel [WHERE kolom = 'nilai'] [LIMIT n]"
    );
  }

  const [, colPart, table, whereCol, whereVal, limitStr] = match;
  const columns =
    colPart.trim() === "*"
      ? ["*"]
      : colPart.split(",").map((c) => c.trim());

  return {
    columns,
    table: table.toLowerCase(),
    where: whereCol ? { column: whereCol, value: whereVal } : undefined,
    limit: limitStr ? parseInt(limitStr, 10) : undefined,
  };
}
