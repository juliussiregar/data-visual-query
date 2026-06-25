import type { TableRelation } from "@/lib/sql-query-types";
import { defaultRelationAlias, defaultRelationLabel } from "@/lib/sql-query-types";
import { resolveProjectDbTables } from "@/lib/db-table-datasets";

const SAFE_ALIAS = /^[a-zA-Z][a-zA-Z0-9_]*$/;

function newRelationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `rel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeTableRelations(value: unknown): TableRelation[] {
  if (!Array.isArray(value)) return [];
  const out: TableRelation[] = [];
  const seenAliases = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const baseTable = typeof raw.baseTable === "string" ? raw.baseTable.trim() : "";
    if (!baseTable) continue;

    const joinsRaw = Array.isArray(raw.joins) ? raw.joins : [];
    const joins = joinsRaw
      .map((j) => {
        if (!j || typeof j !== "object") return null;
        const row = j as Record<string, unknown>;
        const table = typeof row.table === "string" ? row.table.trim() : "";
        const leftKey = typeof row.leftKey === "string" ? row.leftKey.trim() : "";
        const rightKey = typeof row.rightKey === "string" ? row.rightKey.trim() : "";
        if (!table) return null;
        const joinType = row.joinType === "inner" ? "inner" : "left";
        return { table, leftKey, rightKey, joinType: joinType as "inner" | "left" };
      })
      .filter((j): j is NonNullable<typeof j> => j !== null);

    if (joins.length === 0) continue;

    const joinTable = joins[0].table;
    let alias = typeof raw.alias === "string" ? raw.alias.trim() : "";
    if (!alias || !SAFE_ALIAS.test(alias)) {
      alias = defaultRelationAlias(baseTable, joinTable);
    }
    if (seenAliases.has(alias)) continue;
    seenAliases.add(alias);

    const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : newRelationId();
    const label = typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : undefined;

    out.push({ id, alias, label, baseTable, joins });
  }

  return out;
}

export function resolveProjectDatasetKeys(project: {
  activeDbTables?: string[];
  activeDbTable?: string | null;
  tableRelations?: TableRelation[];
}): string[] {
  const base = resolveProjectDbTables(project);
  const relationKeys = (project.tableRelations ?? []).map((r) => r.alias);
  return [...base, ...relationKeys.filter((k) => !base.includes(k))];
}

export function formatDatasetLabel(
  key: string,
  relations?: TableRelation[] | null
): string {
  const rel = relations?.find((r) => r.alias === key);
  if (rel?.label) return rel.label;
  if (rel) {
    const joinName = rel.joins[0]?.table ?? "";
    const short = (name: string) => name.split(".").pop() ?? name;
    return `${short(rel.baseTable)} ⋈ ${short(joinName)}`;
  }
  return key;
}

export function isRelationExecutable(relation: TableRelation): boolean {
  return (
    Boolean(relation.baseTable?.trim()) &&
    relation.joins.length > 0 &&
    relation.joins.every((j) => j.table && j.leftKey && j.rightKey)
  );
}

export function createEmptyRelation(baseTable: string, joinTable: string): TableRelation {
  return {
    id: newRelationId(),
    alias: defaultRelationAlias(baseTable, joinTable),
    label: defaultRelationLabel(baseTable, joinTable),
    baseTable,
    joins: [
      {
        table: joinTable,
        leftKey: "",
        rightKey: "",
        joinType: "left",
      },
    ],
  };
}
