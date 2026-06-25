import type { SqlConnectionConfig } from "@/lib/connectors/sql-types";
import { defaultSchemaForType } from "@/lib/connectors/sql-types";
import { buildJoinSelectSql } from "@/lib/sql-join-builder";
import type { SqlJoinQuerySpec, SqlQuerySpec } from "@/lib/sql-query-types";
import { isSqlJoinQuerySpec } from "@/lib/sql-query-types";
import {
  executeMysqlQuery,
  listMysqlTableColumns,
} from "@/lib/connectors/mysql";
import {
  executePostgresQuery,
  listPostgresTableColumns,
} from "@/lib/connectors/postgres";

const MAX_ROWS = 500;

async function listSqlTableColumns(
  config: SqlConnectionConfig,
  tableName: string
): Promise<string[]> {
  if (config.type === "mysql") return listMysqlTableColumns(config, tableName);
  return listPostgresTableColumns(config, tableName);
}

async function executeSqlRead(
  config: SqlConnectionConfig,
  sql: string,
  params: unknown[]
): Promise<Record<string, string>[]> {
  if (config.type === "mysql") return executeMysqlQuery(config, sql, params);
  return executePostgresQuery(config, sql, params);
}

async function loadSqlJoin(
  config: SqlConnectionConfig,
  spec: SqlJoinQuerySpec,
  maxRows = MAX_ROWS
): Promise<Record<string, string>[]> {
  const defaultSchema = config.schema ?? defaultSchemaForType(config.type, config.database);
  const tables = [spec.baseTable, ...spec.joins.map((j) => j.table)];
  const columnsByTable: Record<string, string[]> = {};

  for (const table of tables) {
    columnsByTable[table] = await listSqlTableColumns(config, table);
  }

  const { sql, params } = buildJoinSelectSql(
    config.type,
    defaultSchema,
    spec,
    columnsByTable,
    maxRows
  );
  return executeSqlRead(config, sql, params);
}

/** Single entry point for Option B (join) and future Option C (raw SQL). */
export async function executeSqlQuery(
  config: SqlConnectionConfig,
  spec: SqlQuerySpec,
  maxRows = MAX_ROWS
): Promise<Record<string, string>[]> {
  if (isSqlJoinQuerySpec(spec)) {
    return loadSqlJoin(config, spec, maxRows);
  }
  if (spec.kind === "raw") {
    throw new Error("Custom SQL belum didukung (Opsi C)");
  }
  throw new Error("Jenis query tidak dikenal");
}

export { loadSqlJoin };
