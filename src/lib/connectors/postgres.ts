import pg from "pg";
import { parseTableRef } from "@/lib/sql-join-builder";
import type { ForeignKeyEdge } from "@/lib/join-key-suggest";
import type { ListSqlTablesOptions } from "@/lib/connectors/sql-types";
import { SQL_TABLE_LIST_CAP } from "@/lib/connectors/sql-types";
import { escapeSqlLikePattern } from "@/lib/db-table-filter";

const { Pool } = pg;

export interface PostgresConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  schema?: string;
}

function toPoolConfig(config: PostgresConnectionConfig): pg.PoolConfig {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    max: 1,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 1000,
  };
}

function rowToRecord(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    out[key] = val == null ? "" : String(val);
  }
  return out;
}

export function parsePostgresBody(body: unknown): PostgresConnectionConfig {
  const b = body as Record<string, unknown>;
  const host = String(b.host ?? "").trim();
  const database = String(b.database ?? "").trim();
  const username = String(b.username ?? "").trim();
  const password = String(b.password ?? "");
  const port = parseInt(String(b.port ?? "5432"), 10);
  const ssl = Boolean(b.ssl);
  const schema = String(b.schema ?? "public").trim() || "public";

  if (!host || !database || !username) {
    throw new Error("Host, nama database, dan username wajib diisi");
  }
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error("Port tidak valid");
  }

  return { host, port, database, username, password, ssl, schema };
}

export async function resolvePostgresConfig(
  body: unknown,
  userId: string
): Promise<PostgresConnectionConfig> {
  const b = body as Record<string, unknown>;
  const connectionId = b.connectionId;
  if (connectionId && typeof connectionId === "string") {
    const { getUserDbConnectionConfig } = await import("@/lib/db/user-connections");
    const config = await getUserDbConnectionConfig(userId, connectionId);
    if (!config) throw new Error("Koneksi database tidak ditemukan");
    return config;
  }
  return parsePostgresBody(body);
}

export async function testPostgresConnection(
  config: PostgresConnectionConfig
): Promise<{ ok: true; serverVersion: string; database: string }> {
  const pool = new Pool(toPoolConfig(config));
  try {
    const res = await pool.query("SELECT version() AS version, current_database() AS db");
    const row = res.rows[0] as { version?: string; db?: string };
    return {
      ok: true,
      serverVersion: row.version?.split(" ")[1] ?? "unknown",
      database: row.db ?? config.database,
    };
  } finally {
    await pool.end();
  }
}

export async function countPostgresTables(
  config: PostgresConnectionConfig
): Promise<number> {
  const pool = new Pool(toPoolConfig(config));
  const schema = config.schema ?? "public";
  try {
    const res = await pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'`,
      [schema]
    );
    return Number(res.rows[0]?.cnt ?? 0);
  } finally {
    await pool.end();
  }
}

export async function listPostgresTables(
  config: PostgresConnectionConfig,
  options?: ListSqlTablesOptions
): Promise<{ schema: string; name: string; fullName: string }[]> {
  const pool = new Pool(toPoolConfig(config));
  const schema = config.schema ?? "public";
  const search = options?.search?.trim();
  try {
    const params: unknown[] = [schema];
    let sql = `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'`;
    if (search) {
      params.push(`%${escapeSqlLikePattern(search)}%`);
      sql += ` AND table_name ILIKE $${params.length} ESCAPE '\\'`;
    }
    sql += ` ORDER BY table_name`;
    sql += search ? ` LIMIT 200` : ` LIMIT ${SQL_TABLE_LIST_CAP}`;
    const res = await pool.query(sql, params);
    return res.rows.map((r: { table_schema: string; table_name: string }) => ({
      schema: r.table_schema,
      name: r.table_name,
      fullName: `${r.table_schema}.${r.table_name}`,
    }));
  } finally {
    await pool.end();
  }
}

export async function listPostgresForeignKeysBetween(
  config: PostgresConnectionConfig,
  tableA: string,
  tableB: string
): Promise<ForeignKeyEdge[]> {
  const schema = config.schema ?? "public";
  const refA = parseTableRef(tableA, schema);
  const refB = parseTableRef(tableB, schema);
  const pool = new Pool(toPoolConfig(config));
  try {
    const res = await pool.query(
      `SELECT
         rel_from.relname AS from_table,
         a.attname AS from_column,
         rel_to.relname AS to_table,
         af.attname AS to_column
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
       JOIN pg_class rel_from ON rel_from.oid = c.conrelid
       JOIN pg_class rel_to ON rel_to.oid = c.confrelid
       JOIN pg_attribute a
         ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) AND NOT a.attisdropped
       JOIN pg_attribute af
         ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey) AND NOT af.attisdropped
       WHERE c.contype = 'f'
         AND n.nspname = $1
         AND (
           (rel_from.relname = $2 AND rel_to.relname = $3)
           OR (rel_from.relname = $3 AND rel_to.relname = $2)
         )`,
      [schema, refA.name, refB.name]
    );
    return res.rows.map(
      (r: {
        from_table: string;
        from_column: string;
        to_table: string;
        to_column: string;
      }) => ({
        fromTable: r.from_table,
        fromColumn: r.from_column,
        toTable: r.to_table,
        toColumn: r.to_column,
      })
    );
  } finally {
    await pool.end();
  }
}

export async function previewPostgresTable(
  config: PostgresConnectionConfig,
  tableName: string,
  limit = 5
): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
  const safeTable = sanitizeTableName(tableName, config.schema ?? "public");
  const pool = new Pool(toPoolConfig(config));
  try {
    const res = await pool.query(`SELECT * FROM ${safeTable} LIMIT $1`, [limit]);
    const columns = res.fields.map((f) => f.name);
    return {
      columns,
      rows: res.rows.map((r) => rowToRecord(r as Record<string, unknown>)),
    };
  } finally {
    await pool.end();
  }
}

export async function listPostgresTableColumns(
  config: PostgresConnectionConfig,
  tableName: string
): Promise<string[]> {
  const schema = config.schema ?? "public";
  const ref = parseTableRef(tableName, schema);
  const pool = new Pool(toPoolConfig(config));
  try {
    const res = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [ref.schema, ref.name]
    );
    return res.rows.map((r: { column_name: string }) => r.column_name);
  } finally {
    await pool.end();
  }
}

export async function executePostgresQuery(
  config: PostgresConnectionConfig,
  sql: string,
  params: unknown[] = []
): Promise<Record<string, string>[]> {
  if (!/^\s*SELECT\b/i.test(sql)) {
    throw new Error("Hanya query SELECT yang diizinkan");
  }
  const pool = new Pool(toPoolConfig(config));
  try {
    const res = await pool.query(sql, params);
    return res.rows.map((r) => rowToRecord(r as Record<string, unknown>));
  } finally {
    await pool.end();
  }
}

export async function loadPostgresTable(
  config: PostgresConnectionConfig,
  tableName: string,
  maxRows = 500
): Promise<Record<string, string>[]> {
  const safeTable = sanitizeTableName(tableName, config.schema ?? "public");
  const pool = new Pool(toPoolConfig(config));
  try {
    const res = await pool.query(`SELECT * FROM ${safeTable} LIMIT $1`, [maxRows]);
    return res.rows.map((r) => rowToRecord(r as Record<string, unknown>));
  } finally {
    await pool.end();
  }
}


function sanitizeTableName(tableName: string, defaultSchema: string): string {
  const trimmed = tableName.trim();
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return `"${defaultSchema}"."${trimmed}"`;
  }
  const parts = trimmed.split(".");
  if (parts.length === 2 && parts.every((p) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p))) {
    return `"${parts[0]}"."${parts[1]}"`;
  }
  throw new Error("Nama tabel tidak valid");
}

export function postgresSourceLabel(config: PostgresConnectionConfig): string {
  return `postgres://${config.host}:${config.port}/${config.database}`;
}
