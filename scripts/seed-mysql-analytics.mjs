#!/usr/bin/env node
/**
 * Seed / refresh retail sample data in the MySQL analytics database.
 * Usage: npm run mysql:seed
 */
import fs from "node:fs/promises";
import mysql from "mysql2/promise";
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

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

const PRODUCTS = [
  ["SKU-001", "Kopi Arabika 250g", "Beverages", 85000, 120],
  ["SKU-002", "Teh Hijau Organik", "Beverages", 62000, 95],
  ["SKU-003", "Susu UHT 1L", "Dairy", 18000, 240],
  ["SKU-004", "Oatmeal Instan", "Pantry", 32000, 180],
  ["SKU-005", "Minyak Goreng 2L", "Pantry", 42000, 160],
  ["SKU-006", "Beras Premium 5kg", "Pantry", 78000, 90],
  ["SKU-007", "Deterjen Cair 1L", "Household", 28000, 140],
  ["SKU-008", "Sabun Cuci Piring", "Household", 15000, 200],
  ["SKU-009", "Tisu 200 lembar", "Household", 22000, 175],
  ["SKU-010", "Shampoo 400ml", "Personal Care", 45000, 110],
  ["SKU-011", "Pasta Gigi", "Personal Care", 12000, 260],
  ["SKU-012", "Snack Keripik", "Snacks", 14000, 300],
  ["SKU-013", "Cokelat Batang", "Snacks", 25000, 150],
  ["SKU-014", "Air Mineral 600ml", "Beverages", 4000, 500],
  ["SKU-015", "Mie Instan 5-pack", "Pantry", 22000, 220],
  ["SKU-016", "Permen Mint 100g", "Snacks", 8000, 400],
];

const REGIONS = ["Jakarta", "Bandung", "Surabaya", "Medan", "Makassar"];
const STATUSES = ["completed", "completed", "completed", "processing", "cancelled"];
const CUSTOMERS = [
  "Andi Wijaya",
  "Budi Santoso",
  "Citra Dewi",
  "Dewi Lestari",
  "Eko Prasetyo",
  "Fitri Handayani",
  "Gilang Ramadhan",
  "Hana Putri",
  "Indra Kusuma",
  "Joko Susilo",
];

async function connectWithRetry(config, attempts = 20) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await mysql.createConnection({
        ...config,
        connectTimeout: 8000,
      });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  }
  throw lastError;
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pad(n) {
  return String(n).padStart(2, "0");
}

async function main() {
  const config = buildMysqlConfig();
  const conn = await connectWithRetry(config);

  const schemaPath = new URL("../docker/mysql-analytics-db/init/01-schema.sql", import.meta.url);
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  for (const statement of schemaSql.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await conn.query(statement);
    } catch (error) {
      const errno = error?.errno;
      // Tabel/indeks sudah ada dari docker-entrypoint-initdb.d
      if (errno === 1050 || errno === 1060 || errno === 1061) continue;
      throw error;
    }
  }

  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  await conn.query("TRUNCATE TABLE daily_sales_summary");
  await conn.query("TRUNCATE TABLE order_items");
  await conn.query("TRUNCATE TABLE orders");
  await conn.query("TRUNCATE TABLE products");
  await conn.query("SET FOREIGN_KEY_CHECKS = 1");

  for (const row of PRODUCTS) {
    await conn.query(
      `INSERT INTO products (sku, name, category, unit_price, stock_qty) VALUES (?, ?, ?, ?, ?)`,
      row
    );
  }

  const [productRows] = await conn.query(
    `SELECT id, unit_price FROM products ORDER BY id`
  );

  const now = Date.now();
  for (let day = 0; day < 30; day += 1) {
    const ordersToday = 3 + Math.floor(Math.random() * 4);
    for (let o = 0; o < ordersToday; o += 1) {
      const orderIndex = day * 10 + o;
      const orderedAt = new Date(now - day * 24 * 60 * 60 * 1000 - o * 3600 * 1000);
      const region = randomItem(REGIONS);
      const status = randomItem(STATUSES);
      const orderCode = `ORD-${orderedAt.getFullYear()}${pad(orderedAt.getMonth() + 1)}${pad(orderedAt.getDate())}-${String(orderIndex + 1).padStart(4, "0")}`;

      const itemCount = 1 + Math.floor(Math.random() * 3);
      const picked = new Set();
      let total = 0;
      const lineItems = [];

      while (lineItems.length < itemCount) {
        const product = randomItem(productRows);
        if (picked.has(product.id)) continue;
        picked.add(product.id);
        const qty = 1 + Math.floor(Math.random() * 4);
        const lineTotal = Number(product.unit_price) * qty;
        total += lineTotal;
        lineItems.push({ productId: product.id, qty, lineTotal });
      }

      const [orderResult] = await conn.query(
        `INSERT INTO orders (order_code, customer_name, region, status, ordered_at, total_amount)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderCode,
          randomItem(CUSTOMERS),
          region,
          status,
          orderedAt,
          total.toFixed(2),
        ]
      );

      const orderId = orderResult.insertId;
      for (const item of lineItems) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, quantity, line_total) VALUES (?, ?, ?, ?)`,
          [orderId, item.productId, item.qty, item.lineTotal.toFixed(2)]
        );
      }
    }
  }

  await conn.query(`
    INSERT INTO daily_sales_summary (summary_date, region, order_count, revenue)
    SELECT
      DATE(ordered_at) AS summary_date,
      region,
      COUNT(*) AS order_count,
      ROUND(SUM(total_amount), 2) AS revenue
    FROM orders
    WHERE status = 'completed'
    GROUP BY DATE(ordered_at), region
  `);

  const [counts] = await conn.query(`
    SELECT
      (SELECT COUNT(*) FROM products) AS products,
      (SELECT COUNT(*) FROM orders) AS orders,
      (SELECT COUNT(*) FROM order_items) AS order_items,
      (SELECT COUNT(*) FROM daily_sales_summary) AS daily_rows
  `);

  await conn.end();

  const stats = counts[0];
  console.log("MySQL retail analytics database seeded:");
  console.log(`  products: ${stats.products}`);
  console.log(`  orders: ${stats.orders}`);
  console.log(`  order_items: ${stats.order_items}`);
  console.log(`  daily_sales_summary: ${stats.daily_rows}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
