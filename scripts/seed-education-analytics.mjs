#!/usr/bin/env node
/**
 * Seed / refresh education sample data in schema `education` (same analytics DB as IoT).
 * Usage: npm run education:seed
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
  return `postgresql://${user}:${encoded}@${host}:${port}/${database}`;
}

const REGIONS = ["Jakarta", "Surabaya", "Bandung", "Medan", "Makassar"];

const STUDENTS = [
  ["S001", "Alya Putri", "Jakarta", "IPA", "12"],
  ["S002", "Bima Santoso", "Jakarta", "IPA", "12"],
  ["S003", "Citra Dewi", "Jakarta", "IPS", "12"],
  ["S004", "Dimas Pratama", "Jakarta", "IPA", "11"],
  ["S005", "Eka Wijaya", "Jakarta", "IPS", "11"],
  ["S006", "Fajar Nugroho", "Surabaya", "IPA", "12"],
  ["S007", "Gita Maharani", "Surabaya", "IPA", "12"],
  ["S008", "Hadi Susanto", "Surabaya", "IPS", "12"],
  ["S009", "Indah Lestari", "Surabaya", "IPA", "11"],
  ["S010", "Joko Hartono", "Surabaya", "IPS", "11"],
  ["S011", "Kirana Sari", "Bandung", "IPA", "12"],
  ["S012", "Lukman Hakim", "Bandung", "IPA", "12"],
  ["S013", "Maya Anggraini", "Bandung", "IPS", "12"],
  ["S014", "Nanda Prasetyo", "Bandung", "IPA", "11"],
  ["S015", "Oki Ramadhan", "Bandung", "IPS", "11"],
  ["S016", "Putri Ayu", "Medan", "IPA", "12"],
  ["S017", "Rizky Maulana", "Medan", "IPA", "12"],
  ["S018", "Sinta Rahayu", "Medan", "IPS", "12"],
  ["S019", "Taufik Hidayat", "Medan", "IPA", "11"],
  ["S020", "Umi Kalsum", "Medan", "IPS", "11"],
  ["S021", "Vino Bastian", "Makassar", "IPA", "12"],
  ["S022", "Wulan Dari", "Makassar", "IPA", "12"],
  ["S023", "Yoga Pratama", "Makassar", "IPS", "12"],
  ["S024", "Zahra Amelia", "Makassar", "IPA", "11"],
  ["S025", "Aditya Nugraha", "Makassar", "IPS", "11"],
];

function scoreBias(jurusan, subject) {
  const ipaBoost = jurusan === "IPA" ? 6 : -2;
  const subjectBias = {
    tugas: 4,
    ulangan: 2,
    ujian: 0,
    fisika: ipaBoost + 3,
    biologi: ipaBoost + 1,
  };
  return 68 + (subjectBias[subject] ?? 0);
}

function randomScore(base, spread = 14) {
  return Math.round((base + (Math.random() * 2 - 1) * spread) * 100) / 100;
}

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
  const url = buildAnalyticsUrl();
  const client = await connectWithRetry(url);

  const schemaPath = new URL("../docker/analytics-db/init/02-education-schema.sql", import.meta.url);
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  await client.query(schemaSql);

  await client.query("TRUNCATE education.student_grades, education.students RESTART IDENTITY CASCADE");

  for (const [code, name, region, jurusan, kelas] of STUDENTS) {
    const inserted = await client.query(
      `
      INSERT INTO education.students (student_code, full_name, region, jurusan, kelas)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [code, name, region, jurusan, kelas]
    );
    const studentId = inserted.rows[0].id;
    const tugas = randomScore(scoreBias(jurusan, "tugas"));
    const ulangan = randomScore(scoreBias(jurusan, "ulangan"));
    const ujian = randomScore(scoreBias(jurusan, "ujian"));
    const fisika = randomScore(scoreBias(jurusan, "fisika"));
    const biologi = randomScore(scoreBias(jurusan, "biologi"));

    await client.query(
      `
      INSERT INTO education.student_grades (
        student_id, student_code, full_name, region, jurusan, kelas, semester,
        tugas, ulangan, ujian, fisika, biologi
      )
      VALUES ($1, $2, $3, $4, $5, $6, '1', $7, $8, $9, $10, $11)
      `,
      [studentId, code, name, region, jurusan, kelas, tugas, ulangan, ujian, fisika, biologi]
    );
  }

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM education.students) AS students,
      (SELECT COUNT(*)::int FROM education.student_grades) AS grades
  `);

  await client.end();

  const stats = counts.rows[0];
  console.log("Education analytics seeded (schema: education):");
  console.log(`  students: ${stats.students}`);
  console.log(`  student_grades: ${stats.grades}`);
  console.log(`  regions: ${REGIONS.join(", ")}`);
  console.log("");
  console.log("SheetVision — koneksi terpisah dari IoT:");
  console.log("  Host: analytics-db (server) / localhost (dev)");
  console.log("  Database: iot_analytics | Schema: education | User: iot_reader");
  console.log("  Tabel: student_grades");
  console.log("");
  console.log("Kolom custom (Pengaturan project → Kolom baru):");
  console.log("  Contoh: IPA = tugas + fisika + biologi");
  console.log("  Query: SELECT region, AVG(ipa) FROM * GROUP BY region");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
