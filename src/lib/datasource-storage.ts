import type { DatabaseConnectionProfile, DatabaseType } from "@/lib/types";

export async function fetchDbConnections(): Promise<DatabaseConnectionProfile[]> {
  const res = await fetch("/api/user/db-connections");
  if (!res.ok) return [];
  const json = await res.json();
  return json.connections ?? [];
}

export async function saveDbConnection(
  profile: DatabaseConnectionProfile,
  password?: string
): Promise<DatabaseConnectionProfile | null> {
  const res = await fetch("/api/user/db-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: profile.id,
      type: profile.type,
      name: profile.name,
      host: profile.host,
      port: profile.port,
      database: profile.database,
      username: profile.username,
      ...(password !== undefined && password !== "" ? { password } : {}),
      ssl: profile.ssl,
      schema: profile.schema,
      lastTestedAt: profile.lastTestedAt,
      lastTestStatus: profile.lastTestStatus,
      lastTestMessage: profile.lastTestMessage,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof json.error === "string" ? json.error : "Gagal menyimpan koneksi"
    );
  }
  return json.connection ?? null;
}

export async function removeDbConnection(id: string): Promise<boolean> {
  const res = await fetch(`/api/user/db-connections?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return res.ok;
}

export function connectionToApiPayload(
  profile: DatabaseConnectionProfile,
  extras?: { table?: string; limit?: number; tables?: string[] }
) {
  return {
    connectionId: profile.id,
    connectionName: profile.name,
    type: profile.type,
    ...extras,
  };
}

/** Tes koneksi baru sebelum disimpan — kirim kredensial lengkap */
export function draftConnectionPayload(
  profile: Omit<DatabaseConnectionProfile, "id" | "createdAt"> & { password: string }
) {
  return {
    type: profile.type,
    connectionName: profile.name,
    host: profile.host,
    port: profile.port,
    database: profile.database,
    username: profile.username,
    password: profile.password,
    ssl: profile.ssl,
    schema: profile.schema,
  };
}
