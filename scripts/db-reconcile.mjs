#!/usr/bin/env node
import pg from "pg";
import { buildDatabaseUrl, loadEnvFile } from "./load-env.mjs";

loadEnvFile();

const BASELINE = "20250624120000_baseline";
const LEGACY = ["20250624000000_init"];

async function main() {
  const client = new pg.Client({ connectionString: buildDatabaseUrl().url });
  await client.connect();

  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const names = new Set(tables.rows.map((r) => r.table_name));

  const required = ["users", "sessions"];
  const hasSchema = required.every((t) => names.has(t));

  const migTable = await client.query(`
    SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists
  `);
  if (!migTable.rows[0].exists) {
    console.log("Tabel _prisma_migrations belum ada — jalankan npm run db:migrate");
    await client.end();
    return;
  }

  if (hasSchema) {
    for (const legacy of LEGACY) {
      await client.query(`DELETE FROM "_prisma_migrations" WHERE migration_name = $1`, [legacy]);
    }
    const baseline = await client.query(
      `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1`,
      [BASELINE]
    );
    if (baseline.rowCount === 0) {
      await client.query(
        `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES (gen_random_uuid()::text, '', NOW(), $1, NULL, NULL, NOW(), 1)`,
        [BASELINE]
      );
      console.log(`Baseline ${BASELINE} ditandai sudah diterapkan.`);
    } else {
      console.log(`Baseline ${BASELINE} sudah tercatat.`);
    }
  } else {
    console.log("Schema belum lengkap — jalankan npm run db:migrate terlebih dahulu.");
  }

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
