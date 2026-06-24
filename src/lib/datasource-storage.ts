import type { DatabaseConnectionProfile } from "@/lib/types";

export async function fetchDbConnections(): Promise<DatabaseConnectionProfile[]> {
  const res = await fetch("/api/user/db-connections");
  if (!res.ok) return [];
  const json = await res.json();
  return json.connections ?? [];
}

export async function saveDbConnection(
  profile: DatabaseConnectionProfile,
  password: string
): Promise<DatabaseConnectionProfile | null> {
  const res = await fetch("/api/user/db-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: profile.id,
      name: profile.name,
      host: profile.host,
      port: profile.port,
      database: profile.database,
      username: profile.username,
      password,
      ssl: profile.ssl,
      schema: profile.schema,
      lastTestedAt: profile.lastTestedAt,
      lastTestStatus: profile.lastTestStatus,
      lastTestMessage: profile.lastTestMessage,
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
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
  extras?: { table?: string; limit?: number }
) {
  return {
    connectionId: profile.id,
    connectionName: profile.name,
    ...extras,
  };
}

/** Tes koneksi baru sebelum disimpan — kirim kredensial lengkap */
export function draftConnectionPayload(
  profile: Omit<DatabaseConnectionProfile, "id" | "createdAt"> & { password: string }
) {
  return {
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
