/** Directed FK edge: fromTable.fromColumn → toTable.toColumn */
export interface ForeignKeyEdge {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface JoinKeySuggestion {
  leftKey: string;
  rightKey: string;
  source: "foreign_key" | "heuristic";
  hint: string;
}

function tableBaseName(table: string): string {
  return (table.split(".").pop() ?? table).trim().toLowerCase();
}

export function formatTableShortName(table: string): string {
  return table.split(".").pop()?.trim() || table.trim();
}

export function guessJoinKeyColumn(baseTable: string, joinTable: string): string {
  void baseTable;
  const joinShort = tableBaseName(joinTable);
  return `${singularize(joinShort)}_id`;
}

/** Pick base/join pair so the example key reads naturally (e.g. device_alerts → devices via device_id). */
export function pickJoinExampleTables(dbTables: string[]): [string, string] {
  if (dbTables.length < 2) return [dbTables[0] ?? "", dbTables[1] ?? ""];
  for (const base of dbTables) {
    for (const join of dbTables) {
      if (base === join) continue;
      const key = guessJoinKeyColumn(base, join);
      const joinSingular = singularize(tableBaseName(join));
      if (key.includes(joinSingular)) return [base, join];
    }
  }
  return [dbTables[0], dbTables[1]];
}

export function buildJoinExampleFromTables(dbTables: string[]): string {
  if (dbTables.length < 2) {
    return "Pilih minimal 2 tabel untuk membuat relasi join.";
  }
  const [baseTable, joinTable] = pickJoinExampleTables(dbTables);
  const base = formatTableShortName(baseTable);
  const join = formatTableShortName(joinTable);
  const key = guessJoinKeyColumn(baseTable, joinTable);
  return `Belum ada relasi. Contoh: ${base} join ${join} via ${key}.`;
}

function singularize(name: string): string {
  if (name.endsWith("ies") && name.length > 3) return `${name.slice(0, -3)}y`;
  if (name.endsWith("s") && name.length > 1) return name.slice(0, -1);
  return name;
}

function fkMatchesTable(fkTable: string, selected: string): boolean {
  return tableBaseName(fkTable) === tableBaseName(selected);
}

export function suggestJoinKeys(
  baseTable: string,
  joinTable: string,
  baseColumns: string[],
  joinColumns: string[],
  foreignKeys: ForeignKeyEdge[]
): JoinKeySuggestion | null {
  const base = tableBaseName(baseTable);
  const join = tableBaseName(joinTable);
  const baseSet = new Set(baseColumns);
  const joinSet = new Set(joinColumns);

  for (const fk of foreignKeys) {
    const from = tableBaseName(fk.fromTable);
    const to = tableBaseName(fk.toTable);

    if (
      (fkMatchesTable(fk.fromTable, baseTable) || from === base) &&
      (fkMatchesTable(fk.toTable, joinTable) || to === join) &&
      baseSet.has(fk.fromColumn) &&
      joinSet.has(fk.toColumn)
    ) {
      return {
        leftKey: fk.fromColumn,
        rightKey: fk.toColumn,
        source: "foreign_key",
        hint: `Foreign key: ${fk.fromColumn} → ${tableBaseName(joinTable)}.${fk.toColumn}`,
      };
    }

    if (
      (fkMatchesTable(fk.fromTable, joinTable) || from === join) &&
      (fkMatchesTable(fk.toTable, baseTable) || to === base) &&
      baseSet.has(fk.toColumn) &&
      joinSet.has(fk.fromColumn)
    ) {
      return {
        leftKey: fk.toColumn,
        rightKey: fk.fromColumn,
        source: "foreign_key",
        hint: `Foreign key: ${tableBaseName(baseTable)}.${fk.toColumn} ← ${fk.fromColumn}`,
      };
    }
  }

  const joinSingular = singularize(join);
  const forwardCandidates = [`${join}_id`, `${joinSingular}_id`];

  if (joinSet.has("id")) {
    for (const col of forwardCandidates) {
      if (baseSet.has(col)) {
        return {
          leftKey: col,
          rightKey: "id",
          source: "heuristic",
          hint: `Pola nama kolom: ${col} → id`,
        };
      }
    }
    const baseFkCols = baseColumns.filter((c) => c.endsWith("_id") && c !== "id");
    if (baseFkCols.length === 1) {
      return {
        leftKey: baseFkCols[0],
        rightKey: "id",
        source: "heuristic",
        hint: `Pola nama kolom: ${baseFkCols[0]} → id`,
      };
    }
  }

  if (baseSet.has("id")) {
    const reverseCandidates = [`${base}_id`, `${singularize(base)}_id`];
    for (const col of reverseCandidates) {
      if (joinSet.has(col)) {
        return {
          leftKey: "id",
          rightKey: col,
          source: "heuristic",
          hint: `Pola nama kolom: id → ${col}`,
        };
      }
    }
    const joinFkCols = joinColumns.filter((c) => c.endsWith("_id") && c !== "id");
    if (joinFkCols.length === 1) {
      return {
        leftKey: "id",
        rightKey: joinFkCols[0],
        source: "heuristic",
        hint: `Pola nama kolom: id → ${joinFkCols[0]}`,
      };
    }
  }

  return null;
}
