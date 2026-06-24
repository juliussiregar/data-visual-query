#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import pg from "pg";
import { buildDatabaseUrl, loadEnvFile } from "../scripts/load-env.mjs";

loadEnvFile();

const databaseUrl = buildDatabaseUrl().url;
process.env.DATABASE_URL = databaseUrl;

const waitForDb = process.env.WAIT_FOR_DB !== "false";
const runMigrate = process.env.RUN_DB_MIGRATE !== "false";
const runSeed = process.env.RUN_DB_SEED === "true";
const runReaderRole = process.env.RUN_DB_READER_ROLE !== "false";

async function waitUntilReady() {
  const maxAttempts = Number(process.env.DB_WAIT_ATTEMPTS ?? 30);
  const delayMs = Number(process.env.DB_WAIT_DELAY_MS ?? 2000);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = new pg.Client({ connectionString: databaseUrl });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      console.log("[entrypoint] Database is ready.");
      return;
    } catch (error) {
      await client.end().catch(() => {});
      console.log(
        `[entrypoint] Waiting for database (${attempt}/${maxAttempts})...`
      );
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

function runNodeScript(scriptPath) {
  const result = spawnSync("node", [scriptPath], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runPrisma(args) {
  const result = spawnSync("node", ["node_modules/prisma/build/index.js", ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  if (waitForDb) {
    await waitUntilReady();
  }

  if (runMigrate) {
    console.log("[entrypoint] Applying Prisma migrations...");
    runPrisma(["migrate", "deploy"]);
  }

  if (runSeed) {
    console.log("[entrypoint] Seeding database...");
    runPrisma(["db", "seed"]);
  }

  if (runReaderRole) {
    console.log("[entrypoint] Ensuring read-only DB role...");
    runNodeScript("scripts/setup-reader-role.mjs");
  }
}

main().catch((error) => {
  console.error("[entrypoint] Startup failed:", error);
  process.exit(1);
});
