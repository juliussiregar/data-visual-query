/** Join type for SQL relations (Option B). */
export type SqlJoinType = "inner" | "left";

export interface SqlJoinClause {
  table: string;
  /** Column on the accumulated left side (base or previous join alias). */
  leftKey: string;
  /** Column on the table being joined. */
  rightKey: string;
  joinType?: SqlJoinType;
}

/** Executable join query — built from {@link TableRelation} or used directly. */
export interface SqlJoinQuerySpec {
  kind: "join";
  baseTable: string;
  joins: SqlJoinClause[];
}

/** Future Option C — custom read-only SQL. */
export interface SqlRawQuerySpec {
  kind: "raw";
  sql: string;
  params?: unknown[];
}

export type SqlQuerySpec = SqlJoinQuerySpec | SqlRawQuerySpec;

/** Project-level table relation → virtual dataset key = {@link TableRelation.alias}. */
export interface TableRelation {
  id: string;
  /** Key in dbDatasets, e.g. orders__products */
  alias: string;
  label?: string;
  baseTable: string;
  joins: SqlJoinClause[];
}

export function isSqlJoinQuerySpec(spec: SqlQuerySpec): spec is SqlJoinQuerySpec {
  return spec.kind === "join";
}

export function relationToQuerySpec(relation: TableRelation): SqlJoinQuerySpec {
  return {
    kind: "join",
    baseTable: relation.baseTable,
    joins: relation.joins,
  };
}

export function defaultRelationAlias(baseTable: string, joinTable: string): string {
  const short = (name: string) => {
    const parts = name.trim().split(".");
    return parts[parts.length - 1] || name.trim();
  };
  return `${short(baseTable)}__${short(joinTable)}`;
}

export function defaultRelationLabel(baseTable: string, joinTable: string): string {
  const short = (name: string) => {
    const parts = name.trim().split(".");
    return parts[parts.length - 1] || name.trim();
  };
  return `${short(baseTable)} ⋈ ${short(joinTable)}`;
}
