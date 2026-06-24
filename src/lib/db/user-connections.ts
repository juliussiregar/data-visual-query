import { getPrisma } from "@/lib/db/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import type { DatabaseConnectionProfile } from "@/lib/types";
import type { PostgresConnectionConfig } from "@/lib/connectors/postgres";

function rowToProfile(row: {
  id: string;
  name: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  ssl: boolean;
  schemaName: string;
  createdAt: Date;
  lastTestedAt: Date | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
}): DatabaseConnectionProfile {
  return {
    id: row.id,
    name: row.name,
    type: "postgresql",
    host: row.host,
    port: row.port,
    database: row.databaseName,
    username: row.username,
    rememberPassword: true,
    ssl: row.ssl,
    schema: row.schemaName,
    createdAt: row.createdAt.toISOString(),
    lastTestedAt: row.lastTestedAt?.toISOString(),
    lastTestStatus:
      row.lastTestStatus === "success" || row.lastTestStatus === "failed"
        ? row.lastTestStatus
        : undefined,
    lastTestMessage: row.lastTestMessage ?? undefined,
  };
}

export async function listUserDbConnections(
  userId: string
): Promise<DatabaseConnectionProfile[]> {
  const rows = await getPrisma().userDbConnection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(rowToProfile);
}

export async function getUserDbConnection(userId: string, connectionId: string) {
  return getPrisma().userDbConnection.findFirst({
    where: { userId, id: connectionId },
  });
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
    database: row.databaseName,
    username: row.username,
    password: decryptSecret(row.passwordEncrypted),
    ssl: row.ssl,
    schema: row.schemaName,
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
  const passwordEncrypted = encryptSecret(input.password);
  const testData = {
    lastTestedAt: input.lastTestedAt ? new Date(input.lastTestedAt) : null,
    lastTestStatus: input.lastTestStatus ?? null,
    lastTestMessage: input.lastTestMessage ?? null,
  };

  if (input.id) {
    const existing = await getPrisma().userDbConnection.findFirst({
      where: { id: input.id, userId },
    });
    if (!existing) throw new Error("Koneksi tidak ditemukan");

    const row = await getPrisma().userDbConnection.update({
      where: { id: input.id },
      data: {
        name: input.name,
        host: input.host,
        port: input.port,
        databaseName: input.database,
        username: input.username,
        passwordEncrypted,
        ssl: input.ssl,
        schemaName: input.schema,
        ...testData,
      },
    });
    return rowToProfile(row);
  }

  const row = await getPrisma().userDbConnection.create({
    data: {
      userId,
      name: input.name,
      host: input.host,
      port: input.port,
      databaseName: input.database,
      username: input.username,
      passwordEncrypted,
      ssl: input.ssl,
      schemaName: input.schema,
      ...testData,
    },
  });
  return rowToProfile(row);
}

export async function deleteUserDbConnection(userId: string, connectionId: string) {
  await getPrisma().userDbConnection.deleteMany({
    where: { userId, id: connectionId },
  });
}

export async function updateConnectionTestStatus(
  userId: string,
  connectionId: string,
  status: "success" | "failed",
  message: string
) {
  await getPrisma().userDbConnection.updateMany({
    where: { userId, id: connectionId },
    data: {
      lastTestedAt: new Date(),
      lastTestStatus: status,
      lastTestMessage: message,
    },
  });
}
