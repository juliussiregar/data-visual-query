import { parseNumber } from "./format";
import type { ColumnMeta } from "./types";

export type FormulaValue = number | null;

/** Resolve column ref: key, label, or [Bracket Name] */
export function resolveColumnRef(ref: string, columns: ColumnMeta[]): string | null {
  const raw = ref.trim();
  if (!raw) return null;
  const bracket = raw.match(/^\[(.+)\]$/);
  const name = (bracket ? bracket[1] : raw).trim();
  const lower = name.toLowerCase();
  const byKey = columns.find((c) => c.key === name || c.key.toLowerCase() === lower);
  if (byKey) return byKey.key;
  const byLabel = columns.find(
    (c) => c.label.toLowerCase() === lower || (c.businessLabel?.toLowerCase() ?? "") === lower
  );
  return byLabel?.key ?? null;
}

type Token =
  | { kind: "num"; value: number }
  | { kind: "id"; value: string }
  | { kind: "op"; value: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" };


function matchColumnRefAt(
  s: string,
  i: number,
  columns: ColumnMeta[]
): { value: string; len: number } | null {
  const rest = s.slice(i);
  const candidates = new Set<string>();
  for (const col of columns) {
    if (col.key.trim()) candidates.add(col.key);
    if (col.label.trim()) candidates.add(col.label);
    if (col.businessLabel?.trim()) candidates.add(col.businessLabel);
  }
  const sorted = [...candidates].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    if (!rest.startsWith(name)) continue;
    const next = rest[name.length];
    if (next !== undefined && !/[\s+\-*/(),]/.test(next)) continue;
    return { value: name, len: name.length };
  }
  return null;
}

function tokenize(input: string, columns: ColumnMeta[] = []): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.trim();
  while (i < s.length) {
    if (/\s/.test(s[i])) {
      i++;
      continue;
    }
    if (s[i] === "(") {
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (s[i] === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (s[i] === ",") {
      tokens.push({ kind: "comma" });
      i++;
      continue;
    }
    if ("+-*/".includes(s[i])) {
      tokens.push({ kind: "op", value: s[i] });
      i++;
      continue;
    }
    if (s[i] === "[") {
      const end = s.indexOf("]", i);
      if (end === -1) throw new Error(`Kurung tutup ] tidak ditemukan`);
      tokens.push({ kind: "id", value: s.slice(i + 1, end).trim() });
      i = end + 1;
      continue;
    }
    const numMatch = s.slice(i).match(/^-?\d+(\.\d+)?/);
    if (numMatch) {
      tokens.push({ kind: "num", value: parseFloat(numMatch[0]) });
      i += numMatch[0].length;
      continue;
    }
    const colMatch = columns.length ? matchColumnRefAt(s, i, columns) : null;
    if (colMatch) {
      tokens.push({ kind: "id", value: colMatch.value });
      i += colMatch.len;
      continue;
    }
    const idMatch = s.slice(i).match(/^[A-Za-z_][\w]*/);
    if (idMatch) {
      tokens.push({ kind: "id", value: idMatch[0] });
      i += idMatch[0].length;
      continue;
    }
    throw new Error(`Karakter tidak dikenali: ${s[i]}`);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(
    private tokens: Token[],
    private row: Record<string, string>,
    private columns: ColumnMeta[],
    private resolveId: (id: string) => FormulaValue
  ) {}

  parse(): FormulaValue {
    const v = this.expr();
    if (this.pos < this.tokens.length) throw new Error("Ekspresi tidak lengkap");
    return v;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error("Ekspresi tidak lengkap");
    this.pos++;
    return t;
  }

  private expr(): FormulaValue {
    let left = this.term();
    while (this.peek()?.kind === "op" && (this.peek() as Token & { value: string }).value.match(/[+-]/)) {
      const op = (this.consume() as { kind: "op"; value: string }).value;
      const right = this.term();
      if (left === null || right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  private term(): FormulaValue {
    let left = this.factor();
    while (this.peek()?.kind === "op" && (this.peek() as Token & { value: string }).value.match(/[*/]/)) {
      const op = (this.consume() as { kind: "op"; value: string }).value;
      const right = this.factor();
      if (left === null || right === null) return null;
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  private factor(): FormulaValue {
    const t = this.peek();
    if (!t) throw new Error("Ekspresi tidak lengkap");
    if (t.kind === "num") {
      this.consume();
      return t.value;
    }
    if (t.kind === "id") {
      const id = (this.consume() as { kind: "id"; value: string }).value;
      const upper = id.toUpperCase();
      if (upper === "SUM" || upper === "AVG" || upper === "MIN" || upper === "MAX" || upper === "COUNT") {
        throw new Error(`Fungsi agregat ${id} hanya untuk metric dataset, bukan per baris`);
      }
      return this.resolveId(id);
    }
    if (t.kind === "lparen") {
      this.consume();
      const v = this.expr();
      if (this.peek()?.kind !== "rparen") throw new Error("Kurung ) tidak ditemukan");
      this.consume();
      return v;
    }
    throw new Error("Faktor tidak valid");
  }
}

/** Evaluate arithmetic expression for one row (e.g. Tugas + Ulangan + Ujian). */
export function evaluateRowExpression(
  formula: string,
  row: Record<string, string>,
  columns: ColumnMeta[]
): FormulaValue {
  const trimmed = formula.trim();
  if (!trimmed) return null;
  try {
    const tokens = tokenize(trimmed, columns);
    const parser = new Parser(tokens, row, columns, (id) => {
      const key = resolveColumnRef(id, columns);
      if (!key) return null;
      return parseNumber(row[key]);
    });
    return parser.parse();
  } catch {
    return null;
  }
}

/** Evaluate aggregate metric formula across all rows. */
export function evaluateAggregateFormula(
  formula: string,
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): FormulaValue {
  const trimmed = formula.trim();
  if (!trimmed) return null;

  if (trimmed.toUpperCase() === "COUNT(*)") return rows.length;

  const sumMatch = trimmed.match(/^SUM\((.+)\)$/i);
  if (sumMatch) {
    return aggregateColumnExpr(sumMatch[1], rows, columns, "sum");
  }

  const avgMatch = trimmed.match(/^AVG\((.+)\)$/i);
  if (avgMatch) {
    return aggregateColumnExpr(avgMatch[1], rows, columns, "avg");
  }

  const minMatch = trimmed.match(/^MIN\((.+)\)$/i);
  if (minMatch) {
    return aggregateColumnExpr(minMatch[1], rows, columns, "min");
  }

  const maxMatch = trimmed.match(/^MAX\((.+)\)$/i);
  if (maxMatch) {
    return aggregateColumnExpr(maxMatch[1], rows, columns, "max");
  }

  // Expression sum per row then aggregate (e.g. Matematika + Fisika + Biologi)
  if (/[+\-*/]/.test(trimmed) || /\[/.test(trimmed)) {
    let total = 0;
    let count = 0;
    for (const row of rows) {
      const v = evaluateRowExpression(trimmed, row, columns);
      if (v !== null && Number.isFinite(v)) {
        total += v;
        count++;
      }
    }
    return count > 0 ? total / count : null;
  }

  const key = resolveColumnRef(trimmed, columns);
  if (key) {
    return aggregateColumnExpr(trimmed, rows, columns, "avg");
  }

  return null;
}

function aggregateColumnExpr(
  expr: string,
  rows: Record<string, string>[],
  columns: ColumnMeta[],
  mode: "sum" | "avg" | "min" | "max"
): FormulaValue {
  const values: number[] = [];
  for (const row of rows) {
    let v: FormulaValue;
    if (/[+\-*/\[]/.test(expr)) {
      v = evaluateRowExpression(expr, row, columns);
    } else {
      const key = resolveColumnRef(expr, columns);
      v = key ? parseNumber(row[key]) : null;
    }
    if (v !== null && Number.isFinite(v)) values.push(v);
  }
  if (values.length === 0) return null;
  if (mode === "sum") return values.reduce((a, b) => a + b, 0);
  if (mode === "avg") return values.reduce((a, b) => a + b, 0) / values.length;
  if (mode === "min") return Math.min(...values);
  return Math.max(...values);
}

export function formulaReferences(formula: string): string[] {
  const refs: string[] = [];
  let remainder = formula;

  const bracket = formula.match(/\[([^\]]+)\]/g);
  if (bracket) {
    refs.push(...bracket.map((b) => b.slice(1, -1).trim()));
    remainder = formula.replace(/\[([^\]]+)\]/g, " ");
  }

  const ids = remainder.match(/\b[A-Za-z_][\w]*\b/g) ?? [];
  for (const id of ids) {
    const u = id.toUpperCase();
    if (["SUM", "AVG", "MIN", "MAX", "COUNT"].includes(u)) continue;
    refs.push(id);
  }
  return [...new Set(refs)];
}
