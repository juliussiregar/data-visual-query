import type { DatabaseType } from "@/lib/types";

export interface DbConnectionErrorContext {
  type?: DatabaseType;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
}

type ErrnoError = Error & {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
};

function dbLabel(type?: DatabaseType): string {
  if (type === "mysql") return "MySQL";
  if (type === "postgresql") return "PostgreSQL";
  return "database";
}

function targetLabel(ctx?: DbConnectionErrorContext): string {
  if (ctx?.host && ctx?.port) return `${ctx.host}:${ctx.port}`;
  if (ctx?.host) return ctx.host;
  return "server database";
}

export function formatDbConnectionError(
  error: unknown,
  ctx?: DbConnectionErrorContext
): string {
  const label = dbLabel(ctx?.type);
  const target = targetLabel(ctx);

  if (!(error instanceof Error)) {
    return `Koneksi ${label} gagal — periksa host, port, database, username, dan password.`;
  }

  const err = error as ErrnoError;
  const msg = `${err.message} ${err.sqlMessage ?? ""}`.toLowerCase();
  const code = err.code?.toUpperCase();

  if (code === "ECONNREFUSED" || msg.includes("econnrefused")) {
    return `Tidak dapat terhubung ke ${target}. Pastikan ${label} berjalan dan port yang diisi benar.`;
  }

  if (code === "ENOTFOUND" || msg.includes("getaddrinfo enotfound")) {
    return `Host "${ctx?.host ?? "?"}" tidak ditemukan. Periksa alamat server database.`;
  }

  if (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    msg.includes("timeout") ||
    msg.includes("timed out")
  ) {
    return `Koneksi ke ${target} timeout. Periksa jaringan, firewall, atau apakah server dapat dijangkau.`;
  }

  if (
    err.errno === 1045 ||
    code === "ER_ACCESS_DENIED_ERROR" ||
    code === "28P01" ||
    msg.includes("access denied") ||
    msg.includes("password authentication failed")
  ) {
    const user = ctx?.username ? ` "${ctx.username}"` : "";
    return `Username atau password salah untuk akun${user}.`;
  }

  if (
    err.errno === 1049 ||
    code === "ER_BAD_DB_ERROR" ||
    code === "3D000" ||
    msg.includes("unknown database") ||
    msg.includes("does not exist")
  ) {
    const db = ctx?.database ? ` "${ctx.database}"` : "";
    return `Database${db} tidak ditemukan. Periksa nama database.`;
  }

  if (code === "ER_HOST_NOT_PRIVILEGED" || msg.includes("is not allowed to connect")) {
    return `Akun tidak diizinkan terhubung dari host ini. Periksa hak akses user di server ${label}.`;
  }

  if (err.sqlMessage?.trim()) {
    return err.sqlMessage.trim();
  }

  if (error.message.trim() && error.message !== "Koneksi gagal") {
    return error.message.trim();
  }

  return `Koneksi ${label} gagal — periksa host, port, database, username, dan password.`;
}
