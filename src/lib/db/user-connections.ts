import { query } from "@/lib/db/app-pool";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import type { DatabaseConnectionProfile } from "@/lib/types";
import type { PostgresConnectionConfig } from "@/lib/connectors/postgres";

interface DbConnectionRow {
  id: string;
  user_id: string;
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password_encrypted: string;
  ssl: boolean;
  schema_name: string;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_message: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProfile(row: DbConnectionRow): DatabaseConnectionProfile {
  return {
    id: row.id,
    name: row.name,
    type: "postgresql",
    host: row.host,
    port: row.port,
    database: row.database_name,
    username: row.username,
    rememberPassword: true,
    ssl: row.ssl,
    schema: row.schema_name,
    createdAt: row.created_at,
    lastTestedAt: row.last_tested_at ?? undefined,
    lastTestStatus:
      row.last_test_status === "success" || row.last_test_status === "failed"
        ? row.last_test_status
        : undefined,
    lastTestMessage: row.last_test_message ?? undefined,
  };
}

export async function listUserDbConnections(
  userId: string
): Promise<DatabaseConnectionProfile[]> {
  const res = await query<DbConnectionRow>(
    `SELECT * FROM user_db_connections WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows.map(rowToProfile);
}

export async function getUserDbConnection(
  userId: string,
  connectionId: string
): Promise<DbConnectionRow | null> {
  const res = await query<DbConnectionRow>(
    `SELECT * FROM user_db_connections WHERE user_id = $1 AND id = $2`,
    [userId, connectionId]
  );
  return res.rows[0] ?? null;
}

export async function getUserDbConnectionConfig(
  userId: string,
  connectionId: string
): Promise<PostgresConnectionConfig | null> {
  const row = await getUserDbConnection(userId, connectionId);
  if (!row) return null;
  return {
    host: row.host,
    port: row.port,
    database: row.database_name,
    username: row.username,
    password: decryptSecret(row.password_encrypted),
    ssl: row.ssl,
    schema: row.schema_name,
  };
}

export async function upsertUserDbConnection(
  userId: string,
  input: {
    id?: string;
    name: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    schema: string;
    lastTestedAt?: string;
    lastTestStatus?: "success" | "failed";
    lastTestMessage?: string;
  }
): Promise<DatabaseConnectionProfile> {
  const encrypted = encryptSecret(input.password);
  if (input.id) {
    const res = await query<DbConnectionRow>(
      `UPDATE user_db_connections SET
        name = $3, host = $4, port = $5, database_name = $6, username = $7,
        password_encrypted = $8, ssl = $9, schema_name = $10,
        last_tested_at = $11, last_test_status = $12, last_test_message = $13,
        updated_at = NOW()
       WHERE user_id = $1 AND id = $2
       RETURNING *`,
      [
        userId,
        input.id,
        input.name,
        input.host,
        input.port,
        input.database,
        input.username,
        encrypted,
        input.ssl,
        input.schema,
        input.lastTestedAt ?? null,
        input.lastTestStatus ?? null,
        input.lastTestMessage ?? null,
      ]
    );
    if (!res.rows[0]) throw new Error("Koneksi tidak ditemukan");
    return rowToProfile(res.rows[0]);
  }

  const res = await query<DbConnectionRow>(
    `INSERT INTO user_db_connections (
      user_id, name, host, port, database_name, username, password_encrypted,
      ssl, schema_name, last_tested_at, last_test_status, last_test_message
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *`,
    [
      userId,
      input.name,
      input.host,
      input.port,
      input.database,
      input.username,
      encrypted,
      input.ssl,
      input.schema,
      input.lastTestedAt ?? null,
      input.lastTestStatus ?? null,
      input.lastTestMessage ?? null,
    ]
  );
  return rowToProfile(res.rows[0]);
}

export async function deleteUserDbConnection(userId: string, connectionId: string) {
  await query(`DELETE FROM user_db_connections WHERE user_id = $1 AND id = $2`, [
    userId,
    connectionId,
  ]);
}

export async function updateConnectionTestStatus(
  userId: string,
  connectionId: string,
  status: "success" | "failed",
  message: string
) {
  await query(
    `UPDATE user_db_connections SET
      last_tested_at = NOW(), last_test_status = $3, last_test_message = $4, updated_at = NOW()
     WHERE user_id = $1 AND id = $2`,
    [userId, connectionId, status, message]
  );
}
