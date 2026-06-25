/**
 * Smoke test: SQL join + FK suggest on PostgreSQL (IoT) and MySQL (retail).
 * Requires analytics DB containers running with seed data.
 *
 *   docker compose up -d analytics-db mysql-analytics-db
 *   npm run analytics:setup && npm run mysql:setup   # first time
 *   npm run verify:join
 */
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

import { executeSqlQuery } from "../src/lib/connectors/sql-query";
import { listSqlForeignKeysBetween } from "../src/lib/connectors/sql";
import { suggestJoinKeys } from "../src/lib/join-key-suggest";
import { listMysqlTableColumns } from "../src/lib/connectors/mysql";
import { listPostgresTableColumns } from "../src/lib/connectors/postgres";
import type { SqlConnectionConfig } from "../src/lib/connectors/sql-types";

const pgConfig: SqlConnectionConfig = {
  type: "postgresql",
  host: process.env.ANALYTICS_DB_HOST ?? "localhost",
  port: Number(process.env.ANALYTICS_DB_PORT ?? 54328),
  database: process.env.ANALYTICS_DB_NAME ?? "iot_analytics",
  username: process.env.ANALYTICS_DB_READER_USER ?? "iot_reader",
  password: process.env.ANALYTICS_DB_READER_PASSWORD ?? "iot_reader",
  ssl: false,
  schema: "public",
};

const mysqlConfig: SqlConnectionConfig = {
  type: "mysql",
  host: process.env.MYSQL_ANALYTICS_DB_HOST ?? "localhost",
  port: Number(process.env.MYSQL_ANALYTICS_DB_PORT ?? 33068),
  database: process.env.MYSQL_ANALYTICS_DB_NAME ?? "retail_analytics",
  username: process.env.MYSQL_ANALYTICS_DB_READER_USER ?? "retail_reader",
  password: process.env.MYSQL_ANALYTICS_DB_READER_PASSWORD ?? "retail_reader",
  ssl: false,
  schema: process.env.MYSQL_ANALYTICS_DB_NAME ?? "retail_analytics",
};

async function verify(
  label: string,
  config: SqlConnectionConfig,
  baseTable: string,
  joinTable: string,
  leftKey: string,
  rightKey: string
) {
  const fks = await listSqlForeignKeysBetween(config, baseTable, joinTable);
  const baseCols =
    config.type === "mysql"
      ? await listMysqlTableColumns(config, baseTable)
      : await listPostgresTableColumns(config, baseTable);
  const joinCols =
    config.type === "mysql"
      ? await listMysqlTableColumns(config, joinTable)
      : await listPostgresTableColumns(config, joinTable);
  const suggestion = suggestJoinKeys(baseTable, joinTable, baseCols, joinCols, fks);

  const rows = await executeSqlQuery(config, {
    kind: "join",
    baseTable,
    joins: [{ table: joinTable, leftKey, rightKey, joinType: "left" }],
  });

  const innerRows = await executeSqlQuery(config, {
    kind: "join",
    baseTable,
    joins: [{ table: joinTable, leftKey, rightKey, joinType: "inner" }],
  });

  console.log(`\n=== ${label} ===`);
  console.log("FK edges:", fks.length, fks[0] ?? "(heuristic fallback)");
  console.log("Suggest:", suggestion);
  console.log("LEFT JOIN rows:", rows.length, "sample keys:", Object.keys(rows[0] ?? {}).slice(0, 4));
  console.log("INNER JOIN rows:", innerRows.length);
  if (!rows.length) throw new Error(`${label}: no rows from LEFT JOIN`);
  if (!rows[0]["devices__name"] && !rows[0]["products__name"]) {
    const hasJoinedCol = Object.keys(rows[0]).some((k) => k.includes("__"));
    if (!hasJoinedCol) throw new Error(`${label}: missing prefixed join columns`);
  }
  return { fks: fks.length, left: rows.length, inner: innerRows.length, suggestion };
}

async function main() {
  await verify(
    "PostgreSQL IoT",
    pgConfig,
    "device_alerts",
    "devices",
    "device_id",
    "id"
  );
  await verify(
    "MySQL retail",
    mysqlConfig,
    "order_items",
    "products",
    "product_id",
    "id"
  );
  console.log("\n✓ All app connector join tests passed");
}

main().catch((e) => {
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
});
