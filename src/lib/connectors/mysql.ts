import mysql from "mysql2/promise";
import type { Connection, ConnectionOptions, RowDataPacket } from "mysql2/promise";
import type { ForeignKeyEdge } from "@/lib/join-key-suggest";
import { parseTableRef } from "@/lib/sql-join-builder";
import type { SqlConnectionConfig, SqlTableInfo, ListSqlTablesOptions } from "@/lib/connectors/sql-types";
import {
  defaultPortForType,
  defaultSchemaForType,
  rowToRecord,
  SQL_TABLE_LIST_CAP,
} from "@/lib/connectors/sql-types";
import { escapeSqlLikePattern } from "@/lib/db-table-filter";

type MysqlRow = Record<string, unknown>;

function mysqlField(row: MysqlRow, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
    if (val != null && val !== "") return String(val);
  }
  return "";
}

function toConnectionOptions(config: SqlConnectionConfig): ConnectionOptions {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 8000,
  };
}

function effectiveSchema(config: SqlConnectionConfig): string {
  const schema = config.schema?.trim();
  if (schema && schema !== "public") return schema;
  return config.database;
}

export function parseMysqlBody(body: unknown): Omit<SqlConnectionConfig, "type"> {
  const b = body as Record<string, unknown>;
  const host = String(b.host ?? "").trim();
  const database = String(b.database ?? "").trim();
  const username = String(b.username ?? "").trim();
  const password = String(b.password ?? "");
  const port = parseInt(String(b.port ?? String(defaultPortForType("mysql"))), 10);
  const ssl = Boolean(b.ssl);
  const schema = String(b.schema ?? "").trim() || defaultSchemaForType("mysql", database);

  if (!host || !database || !username) {
    throw new Error("Host, nama database, dan username wajib diisi");
  }
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error("Port tidak valid");
  }

  return { host, port, database, username, password, ssl, schema };
}

async function withConnection<T>(
  config: SqlConnectionConfig,
  fn: (conn: Connection) => Promise<T>
): Promise<T> {
  const conn = await mysql.createConnection(toConnectionOptions(config));
  try {
    return await fn(conn);
  } finally {
    await conn.end();
  }
}

export async function testMysqlConnection(
  config: SqlConnectionConfig
): Promise<{ ok: true; serverVersion: string; database: string }> {
  return withConnection(config, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT VERSION() AS version, DATABASE() AS db"
    );
    const row = rows[0];
    const version = String(row?.version ?? "unknown");
    return {
      ok: true,
      serverVersion: version.split("-")[0] ?? "unknown",
      database: String(row?.db ?? config.database),
    };
  });
}

export async function countMysqlTables(config: SqlConnectionConfig): Promise<number> {
  const schema = effectiveSchema(config);
  return withConnection(config, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.tables
       WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
      [schema]
    );
    return Number((rows[0] as MysqlRow)?.cnt ?? 0);
  });
}

export async function listMysqlTables(
  config: SqlConnectionConfig,
  options?: ListSqlTablesOptions
): Promise<SqlTableInfo[]> {
  const schema = effectiveSchema(config);
  const search = options?.search?.trim();
  return withConnection(config, async (conn) => {
    const params: unknown[] = [schema];
    let sql = `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_schema = ? AND table_type = 'BASE TABLE'`;
    if (search) {
      sql += ` AND table_name LIKE ? ESCAPE '\\\\'`;
      params.push(`%${escapeSqlLikePattern(search)}%`);
    }
    sql += ` ORDER BY table_name`;
    sql += search ? ` LIMIT 200` : ` LIMIT ${SQL_TABLE_LIST_CAP}`;
    const [rows] = await conn.query<RowDataPacket[]>(sql, params);
    return (rows as MysqlRow[]).map((r) => {
      const schema = mysqlField(r, "table_schema", "TABLE_SCHEMA");
      const name = mysqlField(r, "table_name", "TABLE_NAME");
      return {
        schema,
        name,
        fullName: schema && name ? `${schema}.${name}` : name || schema,
      };
    });
  });
}

export async function listMysqlForeignKeysBetween(
  config: SqlConnectionConfig,
  tableA: string,
  tableB: string
): Promise<ForeignKeyEdge[]> {
  const schema = effectiveSchema(config);
  const refA = parseTableRef(tableA, schema);
  const refB = parseTableRef(tableB, schema);
  return withConnection(config, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
         kcu.TABLE_NAME AS from_table,
         kcu.COLUMN_NAME AS from_column,
         kcu.REFERENCED_TABLE_NAME AS to_table,
         kcu.REFERENCED_COLUMN_NAME AS to_column
       FROM information_schema.KEY_COLUMN_USAGE kcu
       WHERE kcu.TABLE_SCHEMA = ?
         AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
         AND (
           (kcu.TABLE_NAME = ? AND kcu.REFERENCED_TABLE_NAME = ?)
           OR (kcu.TABLE_NAME = ? AND kcu.REFERENCED_TABLE_NAME = ?)
         )`,
      [schema, refA.name, refB.name, refB.name, refA.name]
    );
    return (rows as MysqlRow[]).map((r) => ({
      fromTable: mysqlField(r, "from_table", "FROM_TABLE"),
      fromColumn: mysqlField(r, "from_column", "FROM_COLUMN"),
      toTable: mysqlField(r, "to_table", "TO_TABLE"),
      toColumn: mysqlField(r, "to_column", "TO_COLUMN"),
    }));
  });
}

export async function previewMysqlTable(
  config: SqlConnectionConfig,
  tableName: string,
  limit = 5
): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
  const safeTable = sanitizeMysqlTableName(tableName, effectiveSchema(config));
  return withConnection(config, async (conn) => {
    const [rows, fields] = await conn.query<RowDataPacket[]>(
      `SELECT * FROM ${safeTable} LIMIT ?`,
      [limit]
    );
    const columns = fields?.map((f) => f.name) ?? Object.keys(rows[0] ?? {});
    return {
      columns,
      rows: rows.map((r) => rowToRecord(r as Record<string, unknown>)),
    };
  });
}

export async function listMysqlTableColumns(
  config: SqlConnectionConfig,
  tableName: string
): Promise<string[]> {
  const schema = effectiveSchema(config);
  const ref = parseTableRef(tableName, schema);
  return withConnection(config, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = ? AND table_name = ?
       ORDER BY ordinal_position`,
      [ref.schema, ref.name]
    );
    return (rows as MysqlRow[]).map((r) => mysqlField(r, "column_name", "COLUMN_NAME")).filter(Boolean);
  });
}

export async function executeMysqlQuery(
  config: SqlConnectionConfig,
  sql: string,
  params: unknown[] = []
): Promise<Record<string, string>[]> {
  if (!/^\s*SELECT\b/i.test(sql)) {
    throw new Error("Hanya query SELECT yang diizinkan");
  }
  return withConnection(config, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(sql, params);
    return rows.map((r) => rowToRecord(r as Record<string, unknown>));
  });
}

export async function loadMysqlTable(
  config: SqlConnectionConfig,
  tableName: string,
  maxRows = 500
): Promise<Record<string, string>[]> {
  const safeTable = sanitizeMysqlTableName(tableName, effectiveSchema(config));
  return withConnection(config, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT * FROM ${safeTable} LIMIT ?`,
      [maxRows]
    );
    return rows.map((r) => rowToRecord(r as Record<string, unknown>));
  });
}

function quoteMysqlIdent(name: string): string {
  return `\`${name.replace(/`/g, "``")}\``;
}

function sanitizeMysqlTableName(tableName: string, defaultSchema: string): string {
  const ref = parseTableRef(tableName, defaultSchema);
  return `${quoteMysqlIdent(ref.schema)}.${quoteMysqlIdent(ref.name)}`;
}
