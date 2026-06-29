export function normalizeDbTableSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function matchesDbTableSearch(
  value: string,
  label: string,
  query: string
): boolean {
  const q = normalizeDbTableSearch(query);
  if (!q) return true;
  return label.toLowerCase().includes(q) || value.toLowerCase().includes(q);
}

export function filterDbTableNames(
  tables: string[],
  query: string,
  formatLabel: (value: string) => string = (v) => v
): string[] {
  const q = normalizeDbTableSearch(query);
  if (!q) return tables;
  return tables.filter((table) => matchesDbTableSearch(table, formatLabel(table), q));
}

export interface DbTableSelectOption {
  value: string;
  label: string;
}

export function filterDbTableOptions(
  options: DbTableSelectOption[],
  query: string
): DbTableSelectOption[] {
  const q = normalizeDbTableSearch(query);
  if (!q) return options;
  return options.filter((option) => matchesDbTableSearch(option.value, option.label, q));
}

export function dbTableOptionsFromNames(
  tables: string[],
  formatLabel: (value: string) => string = (v) => v
): DbTableSelectOption[] {
  return tables.map((value) => ({
    value,
    label: formatLabel(value) || value,
  }));
}

/** Show table search when the list is long enough to need filtering. */
export const DB_TABLE_SEARCH_MIN = 5;
