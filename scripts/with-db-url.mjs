#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { buildDatabaseUrl, loadEnvFile } from "./load-env.mjs";

loadEnvFile();

const env = { ...process.env, DATABASE_URL: buildDatabaseUrl().url };
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/with-db-url.mjs <prisma-command...>");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
