#!/usr/bin/env node
import fs from "node:fs/promises";
import pg from "pg";
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

function buildAnalyticsUrl() {
  const password = process.env.ANALYTICS_DB_PASSWORD;
  if (!password) throw new Error("Set ANALYTICS_DB_PASSWORD in .env");
  const host = process.env.ANALYTICS_DB_HOST ?? "localhost";
  const port = process.env.ANALYTICS_DB_PORT ?? "54328";
  const database = process.env.ANALYTICS_DB_NAME ?? "iot_analytics";
  const user = process.env.ANALYTICS_DB_USER ?? "iot_admin";
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

async function main() {
  const readerUser = process.env.ANALYTICS_DB_READER_USER ?? "iot_reader";
  const readerPassword =
    process.env.ANALYTICS_DB_READER_PASSWORD ?? "iot_reader";
  const database = process.env.ANALYTICS_DB_NAME ?? "iot_analytics";
  const escaped = readerPassword.replace(/'/g, "''");

  const client = new pg.Client({ connectionString: buildAnalyticsUrl() });
  await client.connect();

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${readerUser}') THEN
        CREATE ROLE ${readerUser} LOGIN PASSWORD '${escaped}';
      ELSE
        ALTER ROLE ${readerUser} WITH PASSWORD '${escaped}';
      END IF;
    END
    $$;
  `);
  const educationSchemaPath = new URL(
    "../docker/analytics-db/init/02-education-schema.sql",
    import.meta.url
  );
  const educationSchemaSql = await fs.readFile(educationSchemaPath, "utf8");
  await client.query(educationSchemaSql);

  await client.query(`GRANT CONNECT ON DATABASE ${database} TO ${readerUser}`);

  for (const schema of ["public", "education"]) {
    await client.query(`GRANT USAGE ON SCHEMA ${schema} TO ${readerUser}`);
    await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA ${schema} TO ${readerUser}`);
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema} GRANT SELECT ON TABLES TO ${readerUser}`
    );
  }

  await client.end();
  console.log(`Analytics reader role '${readerUser}' ready (schemas: public, education).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
