import type { DatabaseType } from "@/lib/types";
import type { SqlJoinQuerySpec } from "@/lib/sql-query-types";

export interface ParsedTableRef {
  schema: string;
  name: string;
}

export function parseTableRef(tableName: string, defaultSchema: string): ParsedTableRef {
  const trimmed = tableName.trim();
  if (/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { schema: defaultSchema, name: trimmed };
  }
  const parts = trimmed.split(".");
  if (parts.length === 2 && parts.every((p) => /^[a-zA-Z0-9_]+$/.test(p))) {
    return { schema: parts[0], name: parts[1] };
  }
  throw new Error(`Nama tabel tidak valid: ${tableName}`);
}

export function tableShortName(fullTable: string): string {
  const parts = fullTable.trim().split(".");
  return parts[parts.length - 1] || fullTable.trim();
}

export function qualifiedColumnAlias(tableName: string, column: string): string {
  return `${tableShortName(tableName)}__${column}`;
}

function quoteIdentifier(dialect: DatabaseType, name: string): string {
  if (dialect === "mysql") return `\`${name}\``;
  return `"${name.replace(/"/g, '""')}"`;
}

function quoteTable(dialect: DatabaseType, ref: ParsedTableRef): string {
  if (dialect === "mysql") {
    return `${quoteIdentifier(dialect, ref.schema)}.${quoteIdentifier(dialect, ref.name)}`;
  }
  return `${quoteIdentifier(dialect, ref.schema)}.${quoteIdentifier(dialect, ref.name)}`;
}

export interface JoinSqlQuery {
  sql: string;
  params: unknown[];
}

export function buildJoinSelectSql(
  dialect: DatabaseType,
  defaultSchema: string,
  spec: SqlJoinQuerySpec,
  columnsByTable: Record<string, string[]>,
  maxRows: number
): JoinSqlQuery {
  if (!spec.baseTable?.trim()) throw new Error("baseTable wajib diisi");
  if (!spec.joins.length) throw new Error("Minimal satu join diperlukan");

  const baseRef = parseTableRef(spec.baseTable, defaultSchema);
  const baseAlias = "t0";
  const tableAliases: { table: string; alias: string }[] = [
    { table: spec.baseTable, alias: baseAlias },
  ];

  const selectParts: string[] = [];
  const appendColumns = (tableName: string, alias: string) => {
    const cols = columnsByTable[tableName];
    if (!cols?.length) throw new Error(`Kolom tabel ${tableName} tidak ditemukan`);
    for (const col of cols) {
      const outAlias = qualifiedColumnAlias(tableName, col);
      selectParts.push(
        `${alias}.${quoteIdentifier(dialect, col)} AS ${quoteIdentifier(dialect, outAlias)}`
      );
    }
  };

  appendColumns(spec.baseTable, baseAlias);

  const joinClauses: string[] = [];
  spec.joins.forEach((join, index) => {
    const joinAlias = `t${index + 1}`;
    const leftAlias = index === 0 ? baseAlias : `t${index}`;
    const joinRef = parseTableRef(join.table, defaultSchema);
    tableAliases.push({ table: join.table, alias: joinAlias });

    appendColumns(join.table, joinAlias);

    const joinType = join.joinType === "inner" ? "INNER JOIN" : "LEFT JOIN";
    joinClauses.push(
      `${joinType} ${quoteTable(dialect, joinRef)} AS ${joinAlias} ON ${leftAlias}.${quoteIdentifier(dialect, join.leftKey)} = ${joinAlias}.${quoteIdentifier(dialect, join.rightKey)}`
    );
  });

  const limitClause =
    dialect === "mysql" ? "LIMIT ?" : `LIMIT $${1}`;
  const params = dialect === "mysql" ? [maxRows] : [maxRows];

  const sql = [
    `SELECT ${selectParts.join(", ")}`,
    `FROM ${quoteTable(dialect, baseRef)} AS ${baseAlias}`,
    ...joinClauses,
    limitClause,
  ].join("\n");

  return { sql, params };
}
