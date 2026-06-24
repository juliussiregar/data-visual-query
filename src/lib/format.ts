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
