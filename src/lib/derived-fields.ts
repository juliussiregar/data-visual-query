import { evaluateRowExpression, formulaReferences, resolveColumnRef } from "./formula-engine";
import { parseNumber } from "./format";
import type { ColumnMeta, SheetData } from "./types";

export interface DerivedField {
  id: string;
  name: string;
  /** Column key written into each row */
  key: string;
  formula: string;
  unit?: string;
  description?: string;
}

const NON_MEASURE_NUMERIC =
  /^(id|uuid|.*_id|student_code|device_code|code|kelas|semester|recorded_at|summary_date|.*_date)$/i;

export function numericColumns(columns: ColumnMeta[]): ColumnMeta[] {
  return columns.filter(
    (c) =>
      c.type === "number" &&
      c.semanticRole !== "identifier" &&
      !NON_MEASURE_NUMERIC.test(c.key)
  );
}

/** Label tampilan kolom (business label → label → key). */
export function columnDisplayLabel(col: ColumnMeta): string {
  return col.businessLabel?.trim() || col.label?.trim() || col.key;
}

function normalizeFormulaSpacing(formula: string): string {
  return formula.trim().replace(/\s+/g, " ");
}

/** Urutan kolom yang direferensikan rumus (hanya kolom numerik valid). */
export function columnKeysFromFormula(formula: string, columns: ColumnMeta[]): string[] {
  const keys: string[] = [];
  for (const ref of formulaReferences(formula)) {
    const key = resolveColumnRef(ref, columns);
    if (!key || !numericColumns(columns).some((c) => c.key === key)) continue;
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

/** Wrap column key for formulas when it is not a single identifier (e.g. "math score" → "[math score]"). */
export function formatColumnRefForFormula(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return key;
  if (/^[A-Za-z_][\w]*$/.test(trimmed)) return trimmed;
  return `[${trimmed}]`;
}

/** Fix legacy formulas that use spaced keys without brackets. */
export function normalizeFormulaColumnRefs(formula: string, columns: ColumnMeta[]): string {
  let out = formula.trim();
  if (!out) return out;
  const keys = [...columns]
    .map((c) => c.key)
    .filter((k) => k && (!/^[A-Za-z_][\w]*$/.test(k) || k.includes(" ")))
    .sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (out.includes(`[${key}]`)) continue;
    out = out.split(key).join(`[${key}]`);
  }
  return out;
}

/** Gabungkan kolom dengan penjumlahan (+). */
export function buildSumFormula(keys: string[]): string {
  return keys.map((k) => formatColumnRefForFormula(k)).join(" + ");
}

/** Rumus hanya penjumlahan kolom tanpa operator lain. */
export function isSimpleSumFormula(formula: string, columns: ColumnMeta[]): boolean {
  const trimmed = normalizeFormulaSpacing(formula);
  if (!trimmed) return true;
  const keys = columnKeysFromFormula(trimmed, columns);
  if (keys.length === 0) return false;
  return buildSumFormula(keys) === trimmed;
}

/** Fingerprint kolom numerik — deteksi ganti dataset/tabel. */
export function numericColumnsSchemaKey(columns: ColumnMeta[]): string {
  return numericColumns(columns)
    .map((c) => c.key)
    .sort()
    .join("|");
}

/** Apakah rumus hanya merujuk kolom yang ada di schema ini. */
export function isFormulaCompatibleWithColumns(
  formula: string,
  columns: ColumnMeta[]
): boolean {
  const trimmed = formula.trim();
  if (!trimmed) return true;
  for (const ref of formulaReferences(trimmed)) {
    const key = resolveColumnRef(ref, columns);
    if (!key || !columns.some((c) => c.key === key)) return false;
  }
  return true;
}

/** Saran rumus gabungan dari kolom numerik yang tersedia. */
export function suggestFormulaFromColumns(columns: ColumnMeta[], maxTerms = 3): string {
  const nums = numericColumns(columns);
  if (nums.length === 0) return "";
  return buildSumFormula(nums.slice(0, maxTerms).map((c) => c.key));
}

/** Saran nama kolom dihitung dari kolom sumber (dinamis per dataset). */
export function suggestDerivedFieldName(columns: ColumnMeta[]): string {
  const nums = numericColumns(columns);
  if (nums.length === 0) return "";
  if (nums.length === 1) return `Total ${columnDisplayLabel(nums[0])}`;
  if (nums.length === 2) {
    return `${columnDisplayLabel(nums[0])} + ${columnDisplayLabel(nums[1])}`;
  }
  return `Total ${nums.length} kolom`;
}

export interface DerivedFieldExample {
  name: string;
  formula: string;
  /** Satu baris contoh: Nama → rumus */
  line: string;
}

/** Contoh kolom dihitung dari kolom aktual (bukan teks hardcode). */
export function buildDerivedFieldExample(
  columns: ColumnMeta[],
  maxTerms = 5
): DerivedFieldExample | null {
  const nums = numericColumns(columns);
  if (nums.length === 0) return null;
  const terms = nums.slice(0, maxTerms);
  const formula = buildSumFormula(terms.map((c) => c.key));
  const formulaDisplay =
    nums.length > maxTerms ? `${formula} + …` : formula;
  const name = suggestDerivedFieldName(columns);
  return {
    name,
    formula: formulaDisplay,
    line: `${name} → ${formulaDisplay}`,
  };
}

/** Teks bantuan kontekstual untuk form kolom dihitung. */
export function buildDerivedFieldHelpText(
  columns: ColumnMeta[],
  sourceLabel?: string
): string {
  const nums = numericColumns(columns);
  if (nums.length === 0) {
    const prefix = sourceLabel ? `Tabel ${sourceLabel}: ` : "";
    return `${prefix}Belum ada kolom numerik. Muat ulang data atau pilih tabel sumber lain.`;
  }
  const labels = nums.slice(0, 4).map(columnDisplayLabel);
  const more = nums.length > 4 ? ` (+${nums.length - 4} lainnya)` : "";
  const prefix = sourceLabel ? `Tabel ${sourceLabel} — ` : "";
  return `${prefix}Gabungkan kolom numerik dengan + − × ÷. Kolom tersedia: ${labels.join(", ")}${more}.`;
}

/** Preview rumus dengan label kolom (bukan key mentah). */
export function formatFormulaPreview(formula: string, columns: ColumnMeta[]): string {
  const trimmed = formula.trim();
  if (!trimmed) return "";
  let out = trimmed;
  const byKey = [...columns].sort((a, b) => b.key.length - a.key.length);
  for (const col of byKey) {
    const label = columnDisplayLabel(col);
    if (label === col.key) continue;
    out = out.replace(new RegExp(`\\b${escapeRegExp(col.key)}\\b`, "g"), label);
  }
  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createDerivedField(
  name: string,
  formula: string,
  key?: string
): DerivedField {
  const slug =
    key?.trim() ||
    name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "") ||
    `kolom_${Date.now()}`;
  return {
    id: `df_${slug}_${Date.now()}`,
    name: name.trim(),
    key: slug,
    formula: formula.trim(),
    unit: "auto",
  };
}

function sortFieldsByDependency(fields: DerivedField[], columns: ColumnMeta[]): DerivedField[] {
  const keys = new Set([
    ...columns.map((c) => c.key),
    ...fields.map((f) => f.key),
  ]);
  const remaining = [...fields];
  const sorted: DerivedField[] = [];
  const maxPasses = remaining.length * remaining.length + 1;
  let passes = 0;

  while (remaining.length > 0 && passes < maxPasses) {
    passes++;
    const next = remaining.shift()!;
    const refs = formulaReferences(next.formula);
    const deps = refs
      .map((r) => resolveColumnRef(r, columns)?.toLowerCase())
      .filter(Boolean) as string[];
    const needsDerived = deps.some(
      (d) => !columns.some((c) => c.key.toLowerCase() === d) && fields.some((f) => f.key.toLowerCase() === d)
    );
    const unmet = deps.filter(
      (d) =>
        fields.some((f) => f.key.toLowerCase() === d) &&
        !sorted.some((s) => s.key.toLowerCase() === d)
    );
    if (needsDerived && unmet.length > 0) {
      remaining.push(next);
      continue;
    }
    sorted.push(next);
    keys.add(next.key);
  }
  return [...sorted, ...remaining];
}

export function applyDerivedFields(data: SheetData, fields: DerivedField[]): SheetData {
  if (!fields.length) return data;

  const ordered = sortFieldsByDependency(fields, data.columns);
  let columns: ColumnMeta[] = [...data.columns];
  const rows = data.rows.map((row) => ({ ...row }));

  for (const field of ordered) {
    const colExists = columns.some((c) => c.key === field.key);
    const formula = normalizeFormulaColumnRefs(field.formula, columns);
    if (!colExists) {
      columns.push({
        key: field.key,
        label: field.name,
        type: "number",
        uniqueCount: 0,
        sampleValues: [],
        fillRate: 100,
        businessLabel: field.name,
      });
    }

    for (const row of rows) {
      const value = evaluateRowExpression(formula, row, columns);
      row[field.key] = value !== null && Number.isFinite(value) ? String(Math.round(value * 100) / 100) : "";
    }

    const samples = rows.map((r) => r[field.key]).filter(Boolean).slice(0, 5);
    columns = columns.map((c) =>
      c.key === field.key ? { ...c, sampleValues: samples, type: "number" as const } : c
    );
  }

  return { ...data, rows, columns };
}

/** Kolom dihitung yang rumusnya cocok dengan schema tabel ini. */
export function derivedFieldsForTable(
  fields: DerivedField[] | undefined,
  columns: ColumnMeta[]
): DerivedField[] {
  if (!fields?.length) return [];
  return fields.filter((f) => isFormulaCompatibleWithColumns(f.formula, columns));
}

/** Terapkan kolom turunan project ke sheet data (tidak mengubah DB sumber). */
export function sheetDataWithDerivedFields(
  data: SheetData,
  fields?: DerivedField[]
): SheetData {
  if (!fields?.length) return data;
  const compatible = derivedFieldsForTable(fields, data.columns);
  if (!compatible.length) return data;
  return applyDerivedFields(data, compatible);
}

export interface DerivedFieldValidationPreview {
  rows_evaluated: number;
  rows_with_value: number;
  sample_avg: number | null;
  sample_min: number | null;
  sample_max: number | null;
  formula_display: string;
}

/** Validasi & preview kolom dihitung baru (tanpa menyimpan). */
export function validateNewDerivedField(
  name: string,
  formula: string,
  data: { columns: ColumnMeta[]; rows: Record<string, string>[] },
  existingFields: DerivedField[],
  key?: string
):
  | { ok: true; field: DerivedField; preview: DerivedFieldValidationPreview }
  | { ok: false; error: string } {
  const trimmedName = name.trim();
  const trimmedFormula = formula.trim();
  if (!trimmedName) return { ok: false, error: "Nama kolom wajib diisi" };
  if (!trimmedFormula) return { ok: false, error: "Rumus wajib diisi" };

  const field = createDerivedField(trimmedName, trimmedFormula, key);
  const derivedKeys = new Set(existingFields.map((f) => f.key));

  if (existingFields.some((f) => f.key === field.key)) {
    return { ok: false, error: `Kolom custom "${field.key}" sudah ada di project` };
  }

  const sourceCol = data.columns.find((c) => c.key === field.key);
  if (sourceCol && !derivedKeys.has(field.key)) {
    return { ok: false, error: `Key "${field.key}" sudah dipakai kolom sumber data` };
  }

  if (!isFormulaCompatibleWithColumns(trimmedFormula, data.columns)) {
    const refs = formulaReferences(trimmedFormula);
    const missing = refs.filter((ref) => !resolveColumnRef(ref, data.columns));
    if (missing.length > 0) {
      return {
        ok: false,
        error: `Kolom tidak ditemukan dalam rumus: ${missing.join(", ")}. Gunakan key kolom numerik dari analytics pack.`,
      };
    }
    return { ok: false, error: "Rumus tidak valid atau merujuk kolom non-numerik" };
  }

  const previewData = applyDerivedFields(
    {
      ...data,
      charts: [],
      kpis: [],
      insights: [],
      distributions: [],
      topRecords: [],
      sourceUrl: "",
      fetchedAt: new Date().toISOString(),
    },
    [field]
  );
  const nums = previewData.rows
    .map((r) => parseNumber(r[field.key]))
    .filter((n): n is number => n !== null);

  const preview: DerivedFieldValidationPreview = {
    rows_evaluated: previewData.rows.length,
    rows_with_value: nums.length,
    sample_avg: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null,
    sample_min: nums.length ? Math.min(...nums) : null,
    sample_max: nums.length ? Math.max(...nums) : null,
    formula_display: formatFormulaPreview(trimmedFormula, data.columns),
  };

  return { ok: true, field, preview };
}

export function normalizeDerivedFields(raw: unknown): DerivedField[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f): f is Record<string, unknown> => f !== null && typeof f === "object")
    .map((f) => ({
      id: String(f.id ?? `df_${Date.now()}`),
      name: String(f.name ?? ""),
      key: String(f.key ?? ""),
      formula: String(f.formula ?? ""),
      unit: typeof f.unit === "string" ? f.unit : undefined,
      description: typeof f.description === "string" ? f.description : undefined,
    }))
    .filter((f) => f.name && f.key && f.formula);
}
