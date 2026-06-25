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

export function normalizeDatabaseType(value: unknown): DatabaseType {
  return value === "mysql" ? "mysql" : "postgresql";
}

export function databaseTypeLabel(type: DatabaseType): string {
  return type === "mysql" ? "MySQL" : "PostgreSQL";
}

export function defaultPortForType(type: DatabaseType): number {
  return type === "mysql" ? 3306 : 5432;
}

export function defaultSchemaForType(type: DatabaseType, database: string): string {
  return type === "mysql" ? database : "public";
}

export function rowToRecord(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    out[key] = val == null ? "" : String(val);
  }
  return out;
}

export function sqlSourceLabel(config: SqlConnectionConfig): string {
  const scheme = config.type === "mysql" ? "mysql" : "postgres";
  return `${scheme}://${config.host}:${config.port}/${config.database}`;
}

export function datasetSourceType(type: DatabaseType): "postgresql" | "mysql" {
  return type === "mysql" ? "mysql" : "postgresql";
}
