#!/usr/bin/env node
import mysql from "mysql2/promise";
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

function buildRootConfig() {
  const password = process.env.MYSQL_ANALYTICS_DB_PASSWORD;
  if (!password) throw new Error("Set MYSQL_ANALYTICS_DB_PASSWORD in .env");
  return {
    host: process.env.MYSQL_ANALYTICS_DB_HOST ?? "localhost",
    port: parseInt(process.env.MYSQL_ANALYTICS_DB_PORT ?? "33068", 10),
    database: process.env.MYSQL_ANALYTICS_DB_NAME ?? "retail_analytics",
    user: "root",
    password,
  };
}

async function main() {
  const readerUser = process.env.MYSQL_ANALYTICS_DB_READER_USER ?? "retail_reader";
  const readerPassword =
    process.env.MYSQL_ANALYTICS_DB_READER_PASSWORD ?? "retail_reader";
  const database = process.env.MYSQL_ANALYTICS_DB_NAME ?? "retail_analytics";

  if (!/^[a-zA-Z0-9_]+$/.test(readerUser) || !/^[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error("Reader user dan nama database hanya boleh huruf, angka, underscore");
  }

  const escapedPass = readerPassword.replace(/'/g, "''");
  const conn = await mysql.createConnection(buildRootConfig());

  await conn.query(
    `CREATE USER IF NOT EXISTS '${readerUser}'@'%' IDENTIFIED BY '${escapedPass}'`
  );
  await conn.query(`ALTER USER '${readerUser}'@'%' IDENTIFIED BY '${escapedPass}'`);
  await conn.query(`GRANT SELECT ON \`${database}\`.* TO '${readerUser}'@'%'`);
  await conn.query("FLUSH PRIVILEGES");

  await conn.end();
  console.log(`MySQL reader user '${readerUser}' ready (read-only).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
