#!/usr/bin/env node
/**
 * Insert one product without truncating existing data (for refresh testing).
 * Usage: node scripts/mysql-add-product.mjs
 */
import mysql from "mysql2/promise";
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

const NEW_PRODUCT = {
  sku: "SKU-016",
  name: "Permen Mint 100g",
  category: "Snacks",
  unitPrice: 8000,
  stockQty: 400,
};

function buildMysqlConfig() {
  const password = process.env.MYSQL_ANALYTICS_DB_PASSWORD;
  if (!password) {
    throw new Error("Set MYSQL_ANALYTICS_DB_PASSWORD in .env");
  }
  return {
    host: process.env.MYSQL_ANALYTICS_DB_HOST ?? "localhost",
    port: parseInt(process.env.MYSQL_ANALYTICS_DB_PORT ?? "33068", 10),
    database: process.env.MYSQL_ANALYTICS_DB_NAME ?? "retail_analytics",
    user: process.env.MYSQL_ANALYTICS_DB_USER ?? "retail_admin",
    password,
  };
}

async function main() {
  const conn = await mysql.createConnection(buildMysqlConfig());

  const [existing] = await conn.query(
    `SELECT id FROM products WHERE sku = ?`,
    [NEW_PRODUCT.sku]
  );

  if (existing.length > 0) {
    console.log(`Product ${NEW_PRODUCT.sku} already exists (id=${existing[0].id}). Skipped insert.`);
  } else {
    await conn.query(
      `INSERT INTO products (sku, name, category, unit_price, stock_qty) VALUES (?, ?, ?, ?, ?)`,
      [
        NEW_PRODUCT.sku,
        NEW_PRODUCT.name,
        NEW_PRODUCT.category,
        NEW_PRODUCT.unitPrice,
        NEW_PRODUCT.stockQty,
      ]
    );
    console.log(`Inserted ${NEW_PRODUCT.sku} — ${NEW_PRODUCT.name}`);
  }

  const [counts] = await conn.query(`SELECT COUNT(*) AS total FROM products`);
  console.log(`Total products: ${counts[0].total}`);

  await conn.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
