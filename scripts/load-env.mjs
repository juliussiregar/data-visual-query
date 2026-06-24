import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Muat .env ke process.env (tanpa menimpa variabel yang sudah ada). */
export function loadEnvFile() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    const match = url.match(/\/([^/?]+)(\?|$)/);
    return { url, database: match?.[1] ?? process.env.DB_NAME ?? "sheetvision" };
  }
  const password = process.env.DB_PASSWORD ?? process.env.POSTGRES_PASSWORD;
  const host = process.env.DB_HOST ?? process.env.POSTGRES_HOST ?? "localhost";
  const port = process.env.DB_PORT ?? process.env.POSTGRES_PORT ?? "54327";
  const database = process.env.DB_NAME ?? process.env.POSTGRES_DB ?? "sheetvision";
  const user = process.env.DB_USER ?? process.env.POSTGRES_USER ?? "sheetvision";
  if (!password) throw new Error("Set DATABASE_URL atau DB_PASSWORD di .env");
  return {
    url: `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`,
    database,
  };
}
