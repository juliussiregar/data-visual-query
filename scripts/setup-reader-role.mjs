#!/usr/bin/env node
import pg from "pg";
import { buildDatabaseUrl, loadEnvFile } from "./load-env.mjs";

loadEnvFile();

async function main() {
  const readerPassword =
    process.env.DB_READER_PASSWORD ??
    process.env.POSTGRES_READER_PASSWORD ??
    "sheetvision_reader";

  const { url, database } = buildDatabaseUrl();
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  const escaped = readerPassword.replace(/'/g, "''");

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sheetvision_reader') THEN
        CREATE ROLE sheetvision_reader LOGIN PASSWORD '${escaped}';
      ELSE
        ALTER ROLE sheetvision_reader WITH PASSWORD '${escaped}';
      END IF;
    END
    $$;
  `);

  await client.query(`GRANT CONNECT ON DATABASE ${database} TO sheetvision_reader`);
  await client.query(`GRANT USAGE ON SCHEMA public TO sheetvision_reader`);
  await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO sheetvision_reader`);
  await client.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO sheetvision_reader`
  );

  await client.end();
  console.log("Role sheetvision_reader siap (read-only).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
