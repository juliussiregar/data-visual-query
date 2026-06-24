#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { buildDatabaseUrl, loadEnvFile } from "./load-env.mjs";

loadEnvFile();
process.env.DATABASE_URL = buildDatabaseUrl().url;

const result = spawnSync("npx", ["tsx", "prisma/reset-workspace.ts"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
