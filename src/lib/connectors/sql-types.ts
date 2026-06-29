import type { DatabaseType } from "@/lib/types";

export interface SqlConnectionConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  schema?: string;
}

export interface SqlTableInfo {
  schema: string;
  name: string;
  fullName: string;
}

/** Opsi tipe database di form koneksi (urutan tampilan UI). */
export const SQL_DATABASE_TYPES: DatabaseType[] = ["postgresql", "mysql", "mariadb"];

export function isMysqlFamily(type: DatabaseType): boolean {
  return type === "mysql" || type === "mariadb";
}

export function normalizeDatabaseType(value: unknown): DatabaseType {
  if (value === "mysql") return "mysql";
  if (value === "mariadb") return "mariadb";
  return "postgresql";
}

export function databaseTypeLabel(type: DatabaseType): string {
  if (type === "mysql") return "MySQL";
  if (type === "mariadb") return "MariaDB";
  return "PostgreSQL";
}

export function defaultPortForType(type: DatabaseType): number {
  return isMysqlFamily(type) ? 3306 : 5432;
}

export function defaultSchemaForType(type: DatabaseType, database: string): string {
  return isMysqlFamily(type) ? database : "public";
}

export function rowToRecord(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    out[key] = val == null ? "" : String(val);
  }
  return out;
}

export function sqlSourceLabel(config: SqlConnectionConfig): string {
  const scheme =
    config.type === "postgresql"
      ? "postgres"
      : config.type === "mariadb"
        ? "mariadb"
        : "mysql";
  return `${scheme}://${config.host}:${config.port}/${config.database}`;
}

export function datasetSourceType(
  type: DatabaseType
): "postgresql" | "mysql" | "mariadb" {
  if (type === "mysql") return "mysql";
  if (type === "mariadb") return "mariadb";
  return "postgresql";
}
