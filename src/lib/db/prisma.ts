import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function buildDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const password = process.env.DB_PASSWORD ?? process.env.POSTGRES_PASSWORD;
  const host = process.env.DB_HOST ?? process.env.POSTGRES_HOST ?? "localhost";
  const port = process.env.DB_PORT ?? process.env.POSTGRES_PORT ?? "54327";
  const database = process.env.DB_NAME ?? process.env.POSTGRES_DB ?? "sheetvision";
  const user = process.env.DB_USER ?? process.env.POSTGRES_USER ?? "sheetvision";

  if (!password) return undefined;
  const encoded = encodeURIComponent(password);
  return `postgresql://${user}:${encoded}@${host}:${port}/${database}`;
}

export function isAppDatabaseConfigured(): boolean {
  return Boolean(buildDatabaseUrl());
}

function createPrismaClient(): PrismaClient {
  const url = buildDatabaseUrl();
  if (!url) {
    throw new Error("Database aplikasi belum dikonfigurasi. Set DATABASE_URL atau DB_* di .env");
  }
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/** Dipakai saat Prisma client di memory sudah usang setelah `prisma generate`. */
export function resetPrismaClient(): void {
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = undefined;
  }
}
