import type { ColumnMeta, DataScope } from "./types";

const SCOPE_PRIORITY =
  /region|wilayah|cabang|branch|kantor|area|zona|zone|departemen|department|team|tim|divisi/i;

export function getScopeableColumns(columns: ColumnMeta[]): ColumnMeta[] {
  const candidates = columns.filter(
    (c) =>
      (c.type === "category" || c.semanticRole === "dimension") &&
      c.uniqueCount >= 2 &&
      c.uniqueCount <= 40 &&
      !c.sensitive
  );

  return [...candidates].sort((a, b) => {
    const aScore = SCOPE_PRIORITY.test(a.key) ? 2 : 1;
    const bScore = SCOPE_PRIORITY.test(b.key) ? 2 : 1;
    return bScore - aScore || a.uniqueCount - b.uniqueCount;
  });
}

export function applyDataScope(
  rows: Record<string, string>[],
  scope: DataScope | null
): Record<string, string>[] {
  if (!scope?.columnKey || scope.values.length === 0) return rows;
  const allowed = new Set(scope.values.map((v) => v.trim()));
  return rows.filter((row) => allowed.has((row[scope.columnKey] ?? "").trim()));
}

export function isScopeActive(scope: DataScope | null): boolean {
  return Boolean(scope?.columnKey && scope.values.length > 0);
}

export function scopeLabel(scope: DataScope | null, columns: ColumnMeta[]): string | null {
  if (!isScopeActive(scope) || !scope) return null;
  const col = columns.find((c) => c.key === scope.columnKey);
  const name = col?.businessLabel ?? col?.label ?? scope.columnKey;
  const vals =
    scope.values.length <= 2
      ? scope.values.join(", ")
      : `${scope.values.slice(0, 2).join(", ")} +${scope.values.length - 2}`;
  return `${name}: ${vals}`;
}
