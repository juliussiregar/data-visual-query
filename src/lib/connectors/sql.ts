import type { SqlConnectionConfig, SqlTableInfo } from "@/lib/connectors/sql-types";
import {
  databaseTypeLabel,
  datasetSourceType,
  normalizeDatabaseType,
  sqlSourceLabel,
} from "@/lib/connectors/sql-types";
import { parsePostgresBody, testPostgresConnection, listPostgresTables, previewPostgresTable, loadPostgresTable, listPostgresForeignKeysBetween } from "@/lib/connectors/postgres";
import { parseMysqlBody, testMysqlConnection, listMysqlTables, previewMysqlTable, loadMysqlTable, listMysqlForeignKeysBetween } from "@/lib/connectors/mysql";
export { executeSqlQuery } from "@/lib/connectors/sql-query";
import type { ForeignKeyEdge } from "@/lib/join-key-suggest";

export type { SqlConnectionConfig, SqlTableInfo };
export { sqlSourceLabel, databaseTypeLabel, datasetSourceType };

export async function resolveSqlConfig(
  body: unknown,
  userId: string
): Promise<SqlConnectionConfig> {
  const b = body as Record<string, unknown>;
  const connectionId = b.connectionId;
  if (connectionId && typeof connectionId === "string") {
    const { getUserDbConnectionConfig } = await import("@/lib/db/user-connections");
    const config = await getUserDbConnectionConfig(userId, connectionId);
    if (!config) throw new Error("Koneksi database tidak ditemukan");
    return config;
  }

  const type = normalizeDatabaseType(b.type);
  if (type === "mysql") {
    return { type, ...parseMysqlBody(body) };
  }
  return { type: "postgresql", ...parsePostgresBody(body) };
}

export async function testSqlConnection(
  config: SqlConnectionConfig
): Promise<{ ok: true; serverVersion: string; database: string }> {
  if (config.type === "mysql") return testMysqlConnection(config);
  return testPostgresConnection(config);
}

export async function listSqlTables(config: SqlConnectionConfig): Promise<SqlTableInfo[]> {
  if (config.type === "mysql") return listMysqlTables(config);
  return listPostgresTables(config);
}

export async function previewSqlTable(
  config: SqlConnectionConfig,
  tableName: string,
  limit = 5
): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
  if (config.type === "mysql") return previewMysqlTable(config, tableName, limit);
  return previewPostgresTable(config, tableName, limit);
}

export async function loadSqlTable(
  config: SqlConnectionConfig,
  tableName: string,
  maxRows = 500
): Promise<Record<string, string>[]> {
  if (config.type === "mysql") return loadMysqlTable(config, tableName, maxRows);
  return loadPostgresTable(config, tableName, maxRows);
}

export async function listSqlForeignKeysBetween(
  config: SqlConnectionConfig,
  tableA: string,
  tableB: string
): Promise<ForeignKeyEdge[]> {
  if (config.type === "mysql") return listMysqlForeignKeysBetween(config, tableA, tableB);
  return listPostgresForeignKeysBetween(config, tableA, tableB);
}
