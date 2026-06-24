import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

function env(key: string, fallbackKey?: string): string | undefined {
  return process.env[key] ?? (fallbackKey ? process.env[fallbackKey] : undefined);
}

export function isAppDatabaseConfigured(): boolean {
  const password = env("DB_PASSWORD", "POSTGRES_PASSWORD");
  const host = env("DB_HOST", "POSTGRES_HOST");
  const database = env("DB_NAME", "POSTGRES_DB");
  return Boolean(password && (host || database));
}

export function getAppPool(): pg.Pool {
  if (!pool) {
    if (!isAppDatabaseConfigured()) {
      throw new Error("Database aplikasi belum dikonfigurasi. Set DB_* di .env");
    }
    pool = new Pool({
      host: env("DB_HOST", "POSTGRES_HOST") ?? "localhost",
      port: parseInt(env("DB_PORT", "POSTGRES_PORT") ?? "54327", 10),
      database: env("DB_NAME", "POSTGRES_DB") ?? "sheetvision",
      user: env("DB_USER", "POSTGRES_USER") ?? "sheetvision",
      password: env("DB_PASSWORD", "POSTGRES_PASSWORD"),
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return getAppPool().query<T>(text, params);
}
