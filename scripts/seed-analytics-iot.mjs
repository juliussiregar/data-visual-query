#!/usr/bin/env node
/**
 * Seed / refresh IoT sample data in the analytics database.
 * Usage: npm run analytics:seed
 */
import fs from "node:fs/promises";
import pg from "pg";
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

function buildAnalyticsUrl() {
  const password = process.env.ANALYTICS_DB_PASSWORD;
  if (!password) {
    throw new Error("Set ANALYTICS_DB_PASSWORD in .env");
  }
  const host = process.env.ANALYTICS_DB_HOST ?? "localhost";
  const port = process.env.ANALYTICS_DB_PORT ?? "54328";
  const database = process.env.ANALYTICS_DB_NAME ?? "iot_analytics";
  const user = process.env.ANALYTICS_DB_USER ?? "iot_admin";
  const encoded = encodeURIComponent(password);
  return {
    url: `postgresql://${user}:${encoded}@${host}:${port}/${database}`,
    database,
  };
}

const DEVICES = [
  ["TEMP-01", "Sensor Suhu Ruang Produksi", "temperature", "Gedung A - Lantai 1", "production", "online"],
  ["TEMP-02", "Sensor Suhu Gudang", "temperature", "Gedung B - Gudang", "warehouse", "online"],
  ["TEMP-03", "Sensor Suhu Server Room", "temperature", "Gedung A - Server Room", "it", "online"],
  ["HUM-01", "Sensor Kelembapan Produksi", "humidity", "Gedung A - Lantai 1", "production", "online"],
  ["HUM-02", "Sensor Kelembapan Gudang", "humidity", "Gedung B - Gudang", "warehouse", "maintenance"],
  ["ENERGY-01", "Meter Listrik Utama", "energy", "Panel Utama", "utility", "online"],
  ["ENERGY-02", "Meter Listrik Produksi", "energy", "Gedung A - Panel", "production", "online"],
  ["AIR-01", "Sensor Kualitas Udara", "air_quality", "Gedung A - Lobby", "common", "online"],
  ["VIB-01", "Sensor Getaran Mesin", "vibration", "Gedung A - Mesin 3", "production", "online"],
  ["GW-01", "Gateway IoT Utama", "gateway", "Gedung A - Rack Network", "it", "online"],
];

const METRIC_CONFIG = {
  temperature: { metric: "temperature", unit: "celsius", base: 28, spread: 6 },
  humidity: { metric: "humidity", unit: "percent", base: 65, spread: 15 },
  energy: { metric: "power_kw", unit: "kW", base: 42, spread: 18 },
  air_quality: { metric: "co2_ppm", unit: "ppm", base: 680, spread: 220 },
  vibration: { metric: "vibration_mm_s", unit: "mm/s", base: 2.4, spread: 1.2 },
  gateway: { metric: "signal_rssi", unit: "dBm", base: -62, spread: 12 },
};

async function connectWithRetry(url, attempts = 15) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    const client = new pg.Client({ connectionString: url });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw lastError;
}

async function main() {
  const { url } = buildAnalyticsUrl();
  const client = await connectWithRetry(url);

  const schemaPath = new URL("../docker/analytics-db/init/01-schema.sql", import.meta.url);
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  await client.query(schemaSql);

  await client.query("TRUNCATE device_daily_summary, device_alerts, sensor_readings, devices RESTART IDENTITY CASCADE");

  for (const row of DEVICES) {
    await client.query(
      `INSERT INTO devices (device_code, name, device_type, location, zone, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      row
    );
  }

  const devices = await client.query(
    `SELECT id, device_code, device_type, zone, status FROM devices ORDER BY id`
  );

  for (const device of devices.rows) {
    const cfg = METRIC_CONFIG[device.device_type];
    if (!cfg) continue;

    const hourlyBias =
      device.zone === "warehouse" ? -1.5 : device.zone === "it" ? 2 : 0;
    const statusNoise = device.status === "maintenance" ? 1.35 : 1;

    await client.query(
      `
      INSERT INTO sensor_readings (device_id, metric, value, unit, quality, recorded_at)
      SELECT
        $1,
        $2,
        ROUND(
          (
            $3
            + ($4 * sin(extract(epoch FROM ts) / 3600.0))
            + ($5 * random())
          )::numeric,
          2
        ),
        $6,
        CASE WHEN random() < 0.02 THEN 'suspect' ELSE 'good' END,
        ts
      FROM generate_series(
        NOW() - INTERVAL '14 days',
        NOW(),
        INTERVAL '1 hour'
      ) AS ts
      `,
      [
        device.id,
        cfg.metric,
        cfg.base + hourlyBias,
        cfg.spread * statusNoise,
        cfg.spread * 0.15,
        cfg.unit,
      ]
    );
  }

  await client.query(`
    INSERT INTO device_daily_summary (
      device_id, summary_date, metric, avg_value, min_value, max_value, reading_count
    )
    SELECT
      device_id,
      recorded_at::date,
      metric,
      ROUND(AVG(value)::numeric, 2),
      ROUND(MIN(value)::numeric, 2),
      ROUND(MAX(value)::numeric, 2),
      COUNT(*)::int
    FROM sensor_readings
    GROUP BY device_id, recorded_at::date, metric
  `);

  await client.query(`
    INSERT INTO device_alerts (device_id, severity, message, triggered_at, resolved_at)
    SELECT d.id, v.severity, v.message, v.triggered_at, v.resolved_at
    FROM devices d
    JOIN (VALUES
      ('HUM-02', 'warning', 'Kelembapan di atas ambang 80% selama 2 jam', NOW() - INTERVAL '6 hours', NULL),
      ('TEMP-03', 'critical', 'Suhu server room mencapai 32°C', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day 20 hours'),
      ('VIB-01', 'warning', 'Getaran mesin di atas baseline', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '10 hours'),
      ('ENERGY-01', 'info', 'Lonjakan konsumsi listrik pada shift malam', NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours')
    ) AS v(device_code, severity, message, triggered_at, resolved_at)
      ON d.device_code = v.device_code
  `);

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM devices) AS devices,
      (SELECT COUNT(*)::int FROM sensor_readings) AS readings,
      (SELECT COUNT(*)::int FROM device_alerts) AS alerts,
      (SELECT COUNT(*)::int FROM device_daily_summary) AS daily_rows
  `);

  await client.end();

  const stats = counts.rows[0];
  console.log("IoT analytics database seeded:");
  console.log(`  devices: ${stats.devices}`);
  console.log(`  sensor_readings: ${stats.readings}`);
  console.log(`  device_alerts: ${stats.alerts}`);
  console.log(`  device_daily_summary: ${stats.daily_rows}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
