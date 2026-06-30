export function parseNumber(value: string | undefined | null): number | null {
  if (!value || value.trim() === "") return null;

  let cleaned = value.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = cleaned.split(",");
    const isThousands = parts.length > 2 || (parts.length === 2 && parts[1].length === 3);
    cleaned = isThousands ? cleaned.replace(/,/g, "") : cleaned.replace(",", ".");
  } else if (hasDot) {
    const parts = cleaned.split(".");
    const isThousands = parts.length > 2 || (parts.length === 2 && parts[1].length === 3);
    if (isThousands) cleaned = cleaned.replace(/\./g, "");
  }

  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

/** Bulatkan nilai metrik untuk tampilan (hindari 68.97999999999999). */
export function roundMetricValue(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

const CURRENCY_COLUMN_HINTS =
  /plafond|plafon|jumlah|amount|revenue|sales|pendapatan|harga|price|biaya|cost|payment|outstanding|saldo|budget|order_total|unit_price|subtotal|nilai_kredit|gross|net_sales|total_amount|bunga|tertunggak|tunggakan|kredit|portofolio|pokok|angsuran|piutang|limit_kredit|nominal/i;

const NON_CURRENCY_COLUMN_HINTS =
  /tugas|ulangan|ujian|fisika|biologi|matematika|ipa_|skor|score|percent|persen|suhu|temp|humidity|co2|vibration|baseline|steady|peak_load|thermal|air_score|beban|kesehatan|avg_value|min_value|max_value|reading|signal|kelembapan|grade|student_id|student_code|device_code|device_id|^id$|_code$/i;

const IDENTIFIER_COLUMN_HINTS =
  /^(id|uuid|.*_id|student_code|student_id|device_code|device_id|code|kelas|semester|recorded_at|summary_date|.*_date)$/i;

/** Kolom kode/ID — bukan metrik yang boleh dijumlahkan atau diformat Rp. */
export function isIdentifierColumn(
  column: { key: string; semanticRole?: string } | string
): boolean {
  const key = typeof column === "string" ? column : column.key;
  const role = typeof column === "string" ? undefined : column.semanticRole;
  if (role === "identifier") return true;
  return IDENTIFIER_COLUMN_HINTS.test(key);
}

/** Deteksi apakah kolom angka sebaiknya diformat sebagai Rupiah. */
export function inferColumnIsCurrency(
  column: { key: string; label?: string; businessLabel?: string; semanticRole?: string } | string
): boolean {
  const col = typeof column === "string" ? { key: column } : column;
  if (isIdentifierColumn(col)) return false;
  const text = [col.key, col.label, col.businessLabel].filter(Boolean).join(" ");
  const lower = text.toLowerCase();
  if (NON_CURRENCY_COLUMN_HINTS.test(lower)) return false;
  if (CURRENCY_COLUMN_HINTS.test(lower)) return true;
  return false;
}

export type ValueDisplayFormat = "auto" | "currency" | "number";

/** Tentukan apakah nilai diformat Rp — override manual atau deteksi otomatis. */
export function shouldFormatAsCurrency(
  column: { key: string; label?: string; businessLabel?: string; semanticRole?: string },
  format: ValueDisplayFormat = "auto"
): boolean {
  if (format === "currency") return true;
  if (format === "number") return false;
  return inferColumnIsCurrency(column);
}

/** Format nilai tabel/query — angka dibulatkan, teks dibiarkan. */
export function formatDisplayValue(value: string | number): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return String(value);
    const rounded = roundMetricValue(value);
    if (Number.isInteger(rounded)) return rounded.toLocaleString("id-ID");
    return rounded.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  const num = parseNumber(value);
  if (num !== null) return formatDisplayValue(num);
  return value;
}

/** Rupiah penuh (stat card, tabel) — tanpa singkatan jt/M. */
export function formatCurrencyFull(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const rounded = roundMetricValue(value);
  const hasFraction = !Number.isInteger(rounded);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(rounded);
}

/** Format nilai berdasarkan metadata kolom — Rp hanya jika kolom terdeteksi uang. */
export function formatColumnValue(
  column: { key: string; label?: string; businessLabel?: string; semanticRole?: string; type?: string },
  value: string | number
): string {
  if (typeof value === "string" && (value.trim() === "" || value === "—")) {
    return value.trim() === "" ? "—" : value;
  }

  const num = typeof value === "number" ? value : parseNumber(value);
  if (num === null) return String(value);

  if (inferColumnIsCurrency(column)) return formatCurrencyFull(num);
  return formatDisplayValue(num);
}

export function formatNumber(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)} M`;
    }
    if (Math.abs(value) >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)} jt`;
    }
    if (Math.abs(value) >= 1_000) {
      return `${(value / 1_000).toFixed(1)} rb`;
    }
  }
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2)} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1)} jt`;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Compact tick labels for chart axes (avoids clipped long numbers like 1500000 → "000000"). */
export function formatChartAxisTick(value: number, currency = false): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs === 0) return "0";

  if (currency) {
    if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`;
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
    return String(Math.round(value));
  }

  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(0)}rb`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}rb`;
  if (Number.isInteger(value)) return String(value);
  return value < 10 ? value.toFixed(1) : String(Math.round(value));
}

export function chartAxisWidth(
  data: { value: number }[],
  currency = false,
  min = 44,
  max = 68
): number {
  const peak = Math.max(0, ...data.map((d) => Math.abs(d.value)));
  const label = formatChartAxisTick(peak, currency);
  return Math.min(max, Math.max(min, label.length * 7 + 12));
}

export function truncate(text: string, max = 28): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
