import pg from "pg";

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

export async function listPostgresTables(
  config: PostgresConnectionConfig
): Promise<{ schema: string; name: string; fullName: string }[]> {
  const pool = new Pool(toPoolConfig(config));
  const schema = config.schema ?? "public";
  try {
    const res = await pool.query(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'
       ORDER BY table_name
       LIMIT 200`,
      [schema]
    );
    return res.rows.map((r: { table_schema: string; table_name: string }) => ({
      schema: r.table_schema,
      name: r.table_name,
      fullName: `${r.table_schema}.${r.table_name}`,
    }));
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
