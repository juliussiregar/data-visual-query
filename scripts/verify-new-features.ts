/**
 * Smoke test fitur baru: formula engine, derived fields, visual SQL, AI tool, DB schema.
 *
 *   docker compose up -d db analytics-db mysql-analytics-db
 *   npm run analytics:seed && npm run education:seed
 *   npm run verify:features
 */
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

import { loadPostgresTable, listPostgresTables } from "../src/lib/connectors/postgres";
import type { PostgresConnectionConfig } from "../src/lib/connectors/postgres";
import {
  applyDerivedFields,
  buildDerivedFieldExample,
  buildDerivedFieldHelpText,
  buildSumFormula,
  columnKeysFromFormula,
  createDerivedField,
  isFormulaCompatibleWithColumns,
  isSimpleSumFormula,
  normalizeDerivedFields,
  numericColumnsSchemaKey,
  suggestDerivedFieldName,
  suggestFormulaFromColumns,
  validateNewDerivedField,
} from "../src/lib/derived-fields";
import { createQueryDashboardWidgets } from "../src/lib/query-widget";
import { buildTableFromVisualSqlWidget } from "../src/lib/widget-data";
import { evaluateAggregateFormula, evaluateRowExpression } from "../src/lib/formula-engine";
import { executeVisualSql, parseVisualSql, chartConfigFromVisualSqlResult, columnKeysInVisualSql, toggleVisualSqlColumn } from "../src/lib/visual-sql";
import { visualSqlExamplesForColumns } from "../src/lib/visual-sql";
import { executeAiQueryTool } from "../src/lib/ai-query-tools";
import { analyzeSheetData } from "../src/lib/analyzer";
import { isIdentifierColumn, inferColumnIsCurrency } from "../src/lib/format";
import type { ColumnMeta } from "../src/lib/types";

const BASE = process.env.VERIFY_APP_URL ?? "http://localhost:3001";

function pgConfig(schema: string): PostgresConnectionConfig {
  return {
    host: process.env.ANALYTICS_DB_HOST ?? "localhost",
    port: Number(process.env.ANALYTICS_DB_PORT ?? 54328),
    database: process.env.ANALYTICS_DB_NAME ?? "iot_analytics",
    username: process.env.ANALYTICS_DB_READER_USER ?? "iot_reader",
    password: process.env.ANALYTICS_DB_READER_PASSWORD ?? "iot_reader",
    ssl: false,
    schema,
  };
}

function columnsFromKeys(keys: string[]): ColumnMeta[] {
  const categoryKeys = new Set(
    [
      "region",
      "jurusan",
      "kelas",
      "full_name",
      "zone",
      "metric",
      "device_code",
      "semester",
      "recorded_at",
      "summary_date",
    ].map((k) => k.toLowerCase())
  );
  const idKeys = /^(id|student_id|student_code)$/i;
  return keys.map((key) => ({
    key,
    label: key,
    type:
      categoryKeys.has(key.toLowerCase()) || idKeys.test(key)
        ? ("category" as const)
        : ("number" as const),
    uniqueCount: 0,
    sampleValues: [],
    fillRate: 100,
  }));
}

function sheetFromRows(rows: Record<string, string>[]) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const columns = columnsFromKeys(keys);
  return { rows, columns, charts: [], kpis: [], insights: [], distributions: [], topRecords: [], sourceUrl: "", fetchedAt: new Date().toISOString() };
}

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail: string) {
  checks.push({ name, ok: false, detail });
  console.log(`  ✗ ${name} — ${detail}`);
}

function assert(name: string, cond: boolean, detail = "") {
  if (cond) pass(name, detail);
  else fail(name, detail);
}

async function testDatabase() {
  console.log("\n[1] Database & schema");

  const iotTables = await listPostgresTables(pgConfig("public"));
  assert(
    "IoT: list tables (public)",
    iotTables.some((t) => t.name === "device_health_scores"),
    `${iotTables.length} tabel`
  );

  const eduTables = await listPostgresTables(pgConfig("education"));
  assert(
    "Education: list tables (education)",
    eduTables.some((t) => t.name === "student_grades"),
    `${eduTables.length} tabel`
  );

  const healthRows = await loadPostgresTable(pgConfig("public"), "device_health_scores", 500);
  assert("IoT: load device_health_scores", healthRows.length > 0, `${healthRows.length} baris`);

  const gradeRows = await loadPostgresTable(pgConfig("education"), "student_grades", 500);
  assert("Education: load student_grades", gradeRows.length > 0, `${gradeRows.length} baris`);

  return { healthRows, gradeRows };
}

function testFormulaEngine(healthRows: Record<string, string>[], gradeRows: Record<string, string>[]) {
  console.log("\n[2] Formula engine");

  const healthCols = columnsFromKeys(Object.keys(healthRows[0] ?? {}));
  const row = healthRows[0];
  const beban = evaluateRowExpression(
    "baseline_load + peak_load + steady_load",
    row,
    healthCols
  );
  assert("IoT: beban operasi per baris", beban !== null && beban > 0, String(beban));

  const gradeCols = columnsFromKeys(Object.keys(gradeRows[0] ?? {}));
  const matematika = evaluateRowExpression("tugas + ulangan + ujian", gradeRows[0], gradeCols);
  assert("Education: matematika per baris", matematika !== null && matematika > 0, String(matematika));

  const agg = evaluateAggregateFormula("AVG(baseline_load)", healthRows, healthCols);
  assert("Agregat AVG(baseline_load)", agg !== null && agg > 0, String(Math.round(agg! * 100) / 100));
}

function testDerivedFields(healthRows: Record<string, string>[], gradeRows: Record<string, string>[]) {
  console.log("\n[3] Kolom custom (derived fields)");

  const healthSheet = sheetFromRows(healthRows);
  const iotFields = [
    createDerivedField("Beban total", "baseline_load + peak_load + steady_load", "beban_total"),
    createDerivedField("Indeks lengkap", "beban_total + thermal_score + air_score", "indeks_lengkap"),
  ];

  const withIotDerived = applyDerivedFields(healthSheet, iotFields);
  assert("IoT: kolom custom beban_total", Boolean(withIotDerived.rows[0]?.beban_total), withIotDerived.rows[0]?.beban_total);
  assert("IoT: rantai kolom custom", Boolean(withIotDerived.rows[0]?.indeks_lengkap), withIotDerived.rows[0]?.indeks_lengkap);

  const gradeSheet = sheetFromRows(gradeRows);
  const suggested = suggestFormulaFromColumns(gradeSheet.columns);
  assert("Saran rumus dari kolom", suggested.includes("tugas") && suggested.includes("+"), suggested);

  const dynamicExample = buildDerivedFieldExample(gradeSheet.columns);
  assert(
    "Contoh kolom dinamis (education)",
    Boolean(dynamicExample?.formula.includes("tugas")),
    dynamicExample?.line
  );
  assert(
    "Nama kolom dinamis",
    Boolean(suggestDerivedFieldName(gradeSheet.columns)),
    suggestDerivedFieldName(gradeSheet.columns)
  );
  const healthHelp = buildDerivedFieldHelpText(healthSheet.columns);
  assert(
    "Help text dinamis (IoT)",
    healthHelp.includes("baseline_load") || healthHelp.includes("Kolom tersedia"),
    healthHelp.slice(0, 80)
  );

  const eduKey = numericColumnsSchemaKey(gradeSheet.columns);
  const iotKey = numericColumnsSchemaKey(healthSheet.columns);
  assert("Schema key beda per dataset", eduKey !== iotKey && eduKey.length > 0, `${eduKey} vs ${iotKey}`);
  assert(
    "Rumus education tidak cocok di IoT",
    !isFormulaCompatibleWithColumns("tugas + ulangan", healthSheet.columns),
    "tugas + ulangan"
  );
  assert(
    "Rumus IoT cocok di schema IoT",
    isFormulaCompatibleWithColumns("baseline_load + peak_load", healthSheet.columns),
    "baseline_load + peak_load"
  );

  const sumKeys = columnKeysFromFormula("tugas + fisika + biologi", gradeSheet.columns);
  assert("Parse kolom dari rumus", sumKeys.join("|") === "tugas|fisika|biologi", sumKeys.join("|"));
  assert(
    "Deteksi rumus penjumlahan sederhana",
    isSimpleSumFormula("tugas + ulangan", gradeSheet.columns),
    "simple sum"
  );
  assert(
    "Rumus dengan minus = mode manual",
    !isSimpleSumFormula("tugas - ulangan", gradeSheet.columns),
    "tugas - ulangan"
  );
  assert("Build rumus penjumlahan", buildSumFormula(["a", "b"]) === "a + b", buildSumFormula(["a", "b"]));

  const eduFields = [createDerivedField("IPA", "tugas + fisika + biologi", "ipa")];
  const withEduDerived = applyDerivedFields(gradeSheet, eduFields);
  assert("Education: kolom IPA (user-defined)", Boolean(withEduDerived.rows[0]?.ipa), withEduDerived.rows[0]?.ipa);

  const normalized = normalizeDerivedFields([
    { id: "x", name: "Test", key: "test", formula: "tugas + 1" },
    { bad: true },
  ]);
  assert("normalizeDerivedFields", normalized.length === 1, normalized[0]?.key);

  assert("student_code = identifier", isIdentifierColumn("student_code"));
  assert("tugas bukan identifier", !isIdentifierColumn("tugas"));
  assert("student_code bukan currency", !inferColumnIsCurrency("student_code"));

  const analyzed = analyzeSheetData(gradeRows, "test", new Date().toISOString());
  const totalInsight = analyzed.insights.find((i) => i.id === "total-value");
  assert(
    "Insight education tanpa Rp untuk skor",
    Boolean(totalInsight && !totalInsight.title.includes("Rp")),
    totalInsight?.title
  );
  assert(
    "Insight pakai kolom skor bukan student_code",
    Boolean(totalInsight && !totalInsight.title.toLowerCase().includes("student_code")),
    totalInsight?.title
  );
}

function testVisualSql(healthRows: Record<string, string>[], gradeRows: Record<string, string>[]) {
  console.log("\n[4] Visual SQL query editor");

  const eduExamples = visualSqlExamplesForColumns(columnsFromKeys(Object.keys(gradeRows[0] ?? {})));
  assert(
    "Contoh SQL dinamis (education)",
    eduExamples[0]?.includes("region") && eduExamples[0]?.includes("tugas"),
    eduExamples[0]
  );

  const iotExamples = visualSqlExamplesForColumns(columnsFromKeys(Object.keys(healthRows[0] ?? {})));
  assert(
    "Contoh SQL dinamis (IoT)",
    iotExamples[0]?.includes("zone"),
    iotExamples[0]
  );

  const iotFields = [createDerivedField("Beban total", "baseline_load + peak_load + steady_load", "beban_total")];
  const iotDerived = applyDerivedFields(sheetFromRows(healthRows), iotFields);

  const iotSql = "SELECT zone, AVG(beban_total) FROM * GROUP BY zone";
  const iotParsed = parseVisualSql(iotSql);
  assert("Parse IoT SQL", !iotParsed.error && Boolean(iotParsed.query), iotParsed.error ?? "ok");

  const iotResult = executeVisualSql(iotDerived, iotSql);
  assert(
    "Execute IoT SQL",
    !iotResult.error && (iotResult.chart?.data.length ?? 0) > 0,
    iotResult.error ?? `${iotResult.chart?.data.length} grup`
  );

  const eduFields = [createDerivedField("IPA", "tugas + fisika + biologi", "ipa")];
  const eduDerived = applyDerivedFields(sheetFromRows(gradeRows), eduFields);

  const eduSql = "SELECT region, AVG(ipa) FROM * GROUP BY region ORDER BY avg DESC";
  const eduResult = executeVisualSql(eduDerived, eduSql);
  assert(
    "Execute education SQL",
    !eduResult.error && (eduResult.chart?.data.length ?? 0) >= 5,
    eduResult.error ?? `${eduResult.chart?.data.length} region`
  );

  const whereSql = "SELECT region, AVG(ipa) FROM * WHERE region = 'Jakarta' GROUP BY region";
  const whereResult = executeVisualSql(eduDerived, whereSql);
  assert(
    "SQL dengan WHERE",
    !whereResult.error && whereResult.rows.length === 1,
    whereResult.error ?? `${whereResult.rows.length} baris`
  );
  assert(
    "Chart WHERE = 1 grup",
    (whereResult.chart?.data.length ?? 0) === 1,
    `${whereResult.chart?.data.length ?? 0} bar`
  );

  const multiSql =
    "SELECT region, AVG(tugas), AVG(fisika), AVG(biologi) FROM * GROUP BY region";
  const multiResult = executeVisualSql(eduDerived, multiSql);
  assert(
    "Execute multi-metrik SQL",
    !multiResult.error && (multiResult.chart?.series?.length ?? 0) === 3,
    multiResult.error ?? `${multiResult.chart?.series?.length ?? 0} series`
  );
  assert(
    "Multi-metrik data per region",
    (multiResult.chart?.multiSeriesData?.length ?? 0) >= 5,
    `${multiResult.chart?.multiSeriesData?.length ?? 0} region`
  );

  const multiChart = chartConfigFromVisualSqlResult(multiResult, eduDerived.columns, "bar");
  assert(
    "Chart config multi-metrik",
    Boolean(multiChart?.series?.length === 3 && multiChart?.multiSeriesData?.length),
    multiChart?.title
  );

  const stackedChart = chartConfigFromVisualSqlResult(multiResult, eduDerived.columns, "stackedBar");
  assert(
    "Stacked chart type preserved",
    stackedChart?.type === "stackedBar",
    stackedChart?.type
  );

  assert(
    "Contoh multi-metrik education",
    eduExamples.some((ex) => (ex.match(/AVG\(/g) ?? []).length >= 3),
    eduExamples.join(" | ")
  );

  const rawGrades = sheetFromRows(gradeRows);
  const missingDerived = executeVisualSql(
    rawGrades,
    "SELECT region, AVG(ipa) FROM * GROUP BY region"
  );
  assert(
    "Peringatan kolom custom belum dibuat",
    Boolean(missingDerived.error?.includes("ipa")),
    missingDerived.error ?? "no error"
  );

  const gradeCols = eduDerived.columns;
  const baseSql = "SELECT region, AVG(tugas) FROM * GROUP BY region";
  const refs = columnKeysInVisualSql(baseSql, gradeCols);
  assert("Deteksi kolom di SQL", refs.includes("region") && refs.includes("tugas"), refs.join("|"));

  const withFisika = toggleVisualSqlColumn(baseSql, "fisika", gradeCols, true);
  assert(
    "Toggle metrik: tambah AVG(fisika)",
    withFisika.includes("AVG(fisika)") && columnKeysInVisualSql(withFisika, gradeCols).includes("fisika"),
    withFisika
  );
  const withoutFisika = toggleVisualSqlColumn(withFisika, "fisika", gradeCols, false);
  assert(
    "Toggle metrik: hapus AVG(fisika)",
    !withoutFisika.includes("AVG(fisika)"),
    withoutFisika
  );

  const iotCols = iotDerived.columns;
  const iotBase = iotExamples[0] ?? "SELECT zone, AVG(baseline_load) FROM * GROUP BY zone";
  const iotWithPeak = toggleVisualSqlColumn(iotBase, "peak_load", iotCols, true);
  assert(
    "Toggle metrik IoT dinamis",
    iotWithPeak.includes("AVG(peak_load)"),
    iotWithPeak
  );
}

function testQueryDashboardWidgets(gradeRows: Record<string, string>[]) {
  console.log("\n[5] Query → widget (grafik / tabel / keduanya)");

  const eduFields = [createDerivedField("IPA", "tugas + fisika + biologi", "ipa")];
  const sheet = applyDerivedFields(sheetFromRows(gradeRows), eduFields);
  const sql = "SELECT region, AVG(ipa) FROM * GROUP BY region";
  const result = executeVisualSql(sheet, sql);

  const chartOnly = createQueryDashboardWidgets(result, "chart", "bar", sql, sheet, 0);
  assert("Widget grafik dari query", chartOnly.length === 1 && chartOnly[0].visualShape === "bar", chartOnly[0]?.visualShape);

  const tableOnly = createQueryDashboardWidgets(result, "table", "bar", sql, sheet, 1);
  assert("Widget tabel dari query", tableOnly.length === 1 && tableOnly[0].visualShape === "table", tableOnly[0]?.visualShape);

  const both = createQueryDashboardWidgets(result, "both", "bar", sql, sheet, 2);
  assert("Widget grafik + tabel", both.length === 2, `${both.length} widget`);

  const tableData = buildTableFromVisualSqlWidget(sheet, tableOnly[0]);
  assert(
    "Tabel hasil query di dashboard",
    Boolean(tableData && tableData.rows.length >= 5 && tableData.columns.some((c) => c.key.includes("ipa"))),
    tableData ? `${tableData.rows.length} baris` : "kosong"
  );
}

function testAiTool(healthRows: Record<string, string>[]) {
  console.log("\n[6] AI tool run_visual_sql");

  const iotFields = [createDerivedField("Beban total", "baseline_load + peak_load + steady_load", "beban_total")];
  const derived = applyDerivedFields(sheetFromRows(healthRows), iotFields);

  const dataset = { rows: derived.rows, columns: derived.columns, totalRowCount: derived.rows.length };
  const { result, fact } = executeAiQueryTool(
    dataset,
    "run_visual_sql",
    JSON.stringify({ sql: "SELECT zone, AVG(beban_total) FROM * GROUP BY zone LIMIT 5" })
  );
  const r = result as { error?: string; row_count?: number; chart?: unknown[] };
  assert(
    "AI run_visual_sql",
    !r.error && (r.row_count ?? 0) > 0,
    r.error ?? fact.summary
  );

  console.log("\n[6b] AI tool create_derived_field");
  const baseSheet = sheetFromRows(healthRows.slice(0, 30));
  const { result: createResult, fact: createFact } = executeAiQueryTool(
    {
      rows: baseSheet.rows,
      columns: baseSheet.columns,
      totalRowCount: baseSheet.rows.length,
      derivedFields: [],
    },
    "create_derived_field",
    JSON.stringify({ name: "Skor gabungan", formula: "thermal_score + air_score", key: "skor_gabungan" })
  );
  const cr = createResult as {
    ok?: boolean;
    field?: { key: string };
    persist_action?: { type: string };
  };
  assert(
    "AI create_derived_field",
    cr.ok === true &&
      cr.field?.key === "skor_gabungan" &&
      cr.persist_action?.type === "add_derived_field",
    createFact.summary
  );

  const dup = executeAiQueryTool(
    {
      rows: derived.rows,
      columns: derived.columns,
      totalRowCount: derived.rows.length,
      derivedFields: iotFields.map((f) => ({ name: f.name, key: f.key, formula: f.formula })),
    },
    "create_derived_field",
    JSON.stringify({ name: "Beban total 2", formula: "baseline_load + peak_load", key: "beban_total" })
  );
  const dr = dup.result as { ok?: boolean; error?: string };
  assert("AI create_derived_field tolak duplikat", dr.ok !== true, dr.error ?? "harus gagal");

  const validation = validateNewDerivedField(
    "Skor gabungan",
    "thermal_score + air_score",
    baseSheet,
    [],
    "skor_gabungan"
  );
  assert("validateNewDerivedField preview", validation.ok === true, validation.ok ? "" : validation.error);
}

async function testApi() {
  console.log("\n[7] API (app harus jalan di " + BASE + ")");

  let cookie = "";
  try {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    if (!loginRes.ok) {
      fail("Login admin", `HTTP ${loginRes.status}`);
      return;
    }
    const setCookie = loginRes.headers.get("set-cookie") ?? "";
    const match = setCookie.match(/sv-session=([^;]+)/);
    cookie = match ? `sv-session=${match[1]}` : "";
    pass("Login admin", cookie ? "session ok" : "tanpa cookie");
  } catch (e) {
    fail("Login admin", e instanceof Error ? e.message : "unreachable");
    return;
  }

  if (!cookie) return;

  const testBody = {
    type: "postgresql",
    host: process.env.ANALYTICS_DB_HOST ?? "localhost",
    port: Number(process.env.ANALYTICS_DB_PORT ?? 54328),
    database: process.env.ANALYTICS_DB_NAME ?? "iot_analytics",
    username: process.env.ANALYTICS_DB_READER_USER ?? "iot_reader",
    password: process.env.ANALYTICS_DB_READER_PASSWORD ?? "iot_reader",
    schema: "education",
  };

  const testRes = await fetch(`${BASE}/api/datasource/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(testBody),
  });
  const testJson = (await testRes.json()) as { ok?: boolean; message?: string; error?: string };
  assert(
    "API test koneksi education",
    testRes.ok && testJson.ok === true,
    testJson.message ?? testJson.error ?? String(testRes.status)
  );

  const tablesRes = await fetch(`${BASE}/api/datasource/tables`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(testBody),
  });
  const tablesJson = (await tablesRes.json()) as { tables?: { name: string }[]; error?: string };
  assert(
    "API list tables education",
    Boolean(tablesRes.ok && tablesJson.tables?.some((t) => t.name === "student_grades")),
    tablesJson.error ?? `${tablesJson.tables?.length ?? 0} tabel`
  );

  const previewRes = await fetch(`${BASE}/api/datasource/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ ...testBody, table: "student_grades", limit: 5 }),
  });
  const previewJson = (await previewRes.json()) as { rows?: unknown[]; error?: string };
  assert(
    "API preview student_grades",
    previewRes.ok && (previewJson.rows?.length ?? 0) > 0,
    previewJson.error ?? `${previewJson.rows?.length ?? 0} baris`
  );
}

async function main() {
  console.log("=== Verify fitur baru SheetVision ===");

  const { healthRows, gradeRows } = await testDatabase();
  testFormulaEngine(healthRows, gradeRows);
  testDerivedFields(healthRows, gradeRows);
  testVisualSql(healthRows, gradeRows);
  testQueryDashboardWidgets(gradeRows);
  testAiTool(healthRows);
  await testApi();

  const failed = checks.filter((c) => !c.ok);
  console.log("\n=== Ringkasan ===");
  console.log(`Total: ${checks.length} | Lulus: ${checks.length - failed.length} | Gagal: ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nGagal:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
  console.log("\nSemua fitur baru lulus smoke test.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
