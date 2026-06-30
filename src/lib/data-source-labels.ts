export type DataSourceUrlKind = "google_sheet" | "database" | "unknown";

const DATABASE_URL_PREFIXES = [
  "postgres://",
  "postgresql://",
  "mysql://",
  "mariadb://",
  "mssql://",
  "sqlserver://",
];

export function detectDataSourceUrlKind(url: string): DataSourceUrlKind {
  const trimmed = url.trim().toLowerCase();
  if (DATABASE_URL_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return "database";
  }
  if (
    trimmed.includes("docs.google.com/spreadsheets") ||
    trimmed.includes("/spreadsheets/")
  ) {
    return "google_sheet";
  }
  return "unknown";
}

export function isDatabaseSourceUrl(url: string): boolean {
  return detectDataSourceUrlKind(url) === "database";
}

/** @deprecated Use isDatabaseSourceUrl */
export const isPostgresSourceUrl = isDatabaseSourceUrl;

export function databaseTableFromSourceUrl(url: string): string | null {
  const hash = url.split("#")[1]?.trim();
  return hash || null;
}

/** @deprecated Use databaseTableFromSourceUrl */
export const postgresTableFromSourceUrl = databaseTableFromSourceUrl;

export function formatDbTableLabel(table: string): string {
  const trimmed = table.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot > 0 && dot < trimmed.length - 1) {
    const schema = trimmed.slice(0, dot);
    const name = trimmed.slice(dot + 1);
    if (/^_[a-f0-9]{32}$/i.test(schema) || /^[a-f0-9]{32}$/i.test(schema)) {
      return name;
    }
  }
  return trimmed;
}

/** @deprecated Use formatDbTableLabel */
export const formatPostgresTableLabel = formatDbTableLabel;

export function databaseKindLabel(url: string): string {
  const lower = url.trim().toLowerCase();
  if (lower.startsWith("mariadb://")) return "MariaDB";
  if (lower.startsWith("mysql://")) return "MySQL";
  if (lower.startsWith("mssql://") || lower.startsWith("sqlserver://")) return "SQL Server";
  if (lower.startsWith("postgres://") || lower.startsWith("postgresql://")) {
    return "PostgreSQL";
  }
  return "Database SQL";
}

export function deriveDataSourceLabel(url: string, custom?: string): string {
  if (custom?.trim()) return custom.trim();

  const kind = detectDataSourceUrlKind(url);
  if (kind === "database") {
    const table = databaseTableFromSourceUrl(url);
    if (table) return formatDbTableLabel(table);
    return databaseKindLabel(url);
  }
  if (kind === "google_sheet") return "Google Sheet";
  return "Sumber data";
}

export function detectSourcesKind(urls: string[]): DataSourceUrlKind {
  if (urls.length === 0) return "unknown";
  const kinds = new Set(urls.map((url) => detectDataSourceUrlKind(url)));
  if (kinds.size === 1) return kinds.values().next().value ?? "unknown";
  if (kinds.has("database")) return "database";
  if (kinds.has("google_sheet")) return "google_sheet";
  return "unknown";
}
