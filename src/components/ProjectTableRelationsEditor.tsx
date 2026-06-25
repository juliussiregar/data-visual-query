"use client";

import { useCallback, useEffect, useState } from "react";
import { GitMerge, Loader2, Plus, Trash2 } from "lucide-react";
import type { DatabaseConnectionProfile } from "@/lib/types";
import type { TableRelation } from "@/lib/sql-query-types";
import { defaultRelationAlias, defaultRelationLabel } from "@/lib/sql-query-types";
import type { JoinKeySuggestion } from "@/lib/join-key-suggest";
import { buildJoinExampleFromTables } from "@/lib/join-key-suggest";
import {
  createEmptyRelation,
  formatDatasetLabel,
} from "@/lib/table-relations";
import { connectionToApiPayload } from "@/lib/datasource-storage";
import { cn } from "@/lib/utils";

interface ProjectTableRelationsEditorProps {
  dbTables: string[];
  relations: TableRelation[];
  connection: DatabaseConnectionProfile | null;
  onChange: (relations: TableRelation[]) => void;
}

function RelationCard({
  relation,
  dbTables,
  connection,
  onUpdate,
  onRemove,
}: {
  relation: TableRelation;
  dbTables: string[];
  connection: DatabaseConnectionProfile | null;
  onUpdate: (next: TableRelation) => void;
  onRemove: () => void;
}) {
  const join = relation.joins[0];
  const [baseColumns, setBaseColumns] = useState<string[]>([]);
  const [joinColumns, setJoinColumns] = useState<string[]>([]);
  const [loadingCols, setLoadingCols] = useState(false);
  const [suggestionHint, setSuggestionHint] = useState<string | null>(null);

  const applySuggestion = useCallback(
    (suggestion: JoinKeySuggestion | null, force = false) => {
      if (!join || !suggestion) {
        setSuggestionHint(null);
        return;
      }
      const keysEmpty = !join.leftKey && !join.rightKey;
      if (!force && !keysEmpty) return;
      onUpdate({
        ...relation,
        joins: [
          {
            ...join,
            leftKey: suggestion.leftKey,
            rightKey: suggestion.rightKey,
          },
        ],
      });
      setSuggestionHint(suggestion.hint);
    },
    [join, onUpdate, relation]
  );

  const loadColumnsAndSuggest = useCallback(async () => {
    if (!connection || !relation.baseTable || !join?.table) {
      setBaseColumns([]);
      setJoinColumns([]);
      setSuggestionHint(null);
      return;
    }
    setLoadingCols(true);
    try {
      const res = await fetch("/api/datasource/suggest-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...connectionToApiPayload(connection),
          baseTable: relation.baseTable,
          joinTable: join.table,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat kolom");
      setBaseColumns((json.baseColumns as string[]) ?? []);
      setJoinColumns((json.joinColumns as string[]) ?? []);
      applySuggestion((json.suggestion as JoinKeySuggestion | null) ?? null);
    } catch {
      setBaseColumns([]);
      setJoinColumns([]);
      setSuggestionHint(null);
    } finally {
      setLoadingCols(false);
    }
  }, [connection, relation.baseTable, join?.table, applySuggestion]);

  useEffect(() => {
    void loadColumnsAndSuggest();
  }, [loadColumnsAndSuggest]);

  const patchJoin = (patch: Partial<NonNullable<typeof join>>, resetKeys = false) => {
    if (!join) return;
    const nextJoin = {
      ...join,
      ...patch,
      ...(resetKeys ? { leftKey: "", rightKey: "" } : {}),
    };
    const joinTable = nextJoin.table;
    onUpdate({
      ...relation,
      alias:
        patch.table !== undefined
          ? defaultRelationAlias(relation.baseTable, joinTable)
          : relation.alias,
      label:
        patch.table !== undefined
          ? defaultRelationLabel(relation.baseTable, joinTable)
          : relation.label,
      joins: [nextJoin],
    });
    if (resetKeys) setSuggestionHint(null);
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-900">
          <GitMerge className="h-3.5 w-3.5" />
          {formatDatasetLabel(relation.alias, [relation])}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-slate-400 hover:bg-white hover:text-red-600"
          title="Hapus relasi"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">Tabel dasar</span>
          <select
            value={relation.baseTable}
            onChange={(e) => {
              const baseTable = e.target.value;
              const joinTable = join?.table ?? "";
              onUpdate({
                ...relation,
                baseTable,
                alias: joinTable ? defaultRelationAlias(baseTable, joinTable) : relation.alias,
                label: joinTable ? defaultRelationLabel(baseTable, joinTable) : relation.label,
                joins: join
                  ? [{ ...join, leftKey: "", rightKey: "" }]
                  : relation.joins,
              });
              setSuggestionHint(null);
            }}
            className="input-field text-xs"
          >
            <option value="">Pilih…</option>
            {dbTables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">Tabel join</span>
          <select
            value={join?.table ?? ""}
            onChange={(e) => patchJoin({ table: e.target.value }, true)}
            className="input-field text-xs"
          >
            <option value="">Pilih…</option>
            {dbTables
              .filter((t) => t !== relation.baseTable)
              .map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">Kunci kiri</span>
          <select
            value={join?.leftKey ?? ""}
            onChange={(e) => patchJoin({ leftKey: e.target.value })}
            disabled={loadingCols}
            className="input-field text-xs"
          >
            <option value="">Pilih kolom…</option>
            {baseColumns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">Kunci kanan</span>
          <select
            value={join?.rightKey ?? ""}
            onChange={(e) => patchJoin({ rightKey: e.target.value })}
            disabled={loadingCols}
            className="input-field text-xs"
          >
            <option value="">Pilih kolom…</option>
            {joinColumns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">Tipe join</span>
          <select
            value={join?.joinType ?? "left"}
            onChange={(e) =>
              patchJoin({ joinType: e.target.value === "inner" ? "inner" : "left" })
            }
            className="input-field text-xs"
          >
            <option value="left">LEFT JOIN</option>
            <option value="inner">INNER JOIN</option>
          </select>
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">Alias dataset</span>
          <input
            value={relation.alias}
            onChange={(e) => onUpdate({ ...relation, alias: e.target.value })}
            className="input-field font-mono text-xs"
            placeholder={defaultRelationAlias(relation.baseTable, join?.table ?? "")}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">Label tampilan</span>
          <input
            value={relation.label ?? ""}
            onChange={(e) => onUpdate({ ...relation, label: e.target.value })}
            className="input-field text-xs"
            placeholder={defaultRelationLabel(relation.baseTable, join?.table ?? "")}
          />
        </label>
      </div>

      {loadingCols && (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Memuat kolom &amp; menyarankan kunci join…
        </p>
      )}
      {!loadingCols && suggestionHint && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-800">
          Disarankan: {suggestionHint}
        </p>
      )}
    </div>
  );
}

export function ProjectTableRelationsEditor({
  dbTables,
  relations,
  connection,
  onChange,
}: ProjectTableRelationsEditorProps) {
  if (dbTables.length < 2) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-[11px] text-slate-500">
        Pilih minimal 2 tabel untuk membuat relasi join.
      </p>
    );
  }

  const addRelation = () => {
    const base = dbTables[0];
    const joinTable = dbTables.find((t) => t !== base) ?? dbTables[1];
    onChange([...relations, createEmptyRelation(base, joinTable)]);
  };

  const joinExample = buildJoinExampleFromTables(dbTables);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-800">Relasi tabel (SQL JOIN)</p>
          <p className="text-[11px] text-slate-500">
            Hasil join tersedia sebagai dataset virtual di widget builder.
          </p>
        </div>
        <button
          type="button"
          onClick={addRelation}
          className={cn("btn-ghost shrink-0 gap-1 border border-slate-200 py-1.5 text-[11px]")}
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah join
        </button>
      </div>

      {relations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-violet-200 bg-violet-50/30 px-3 py-2 text-[11px] text-violet-800/80">
          {joinExample}
        </p>
      ) : (
        relations.map((relation) => (
          <RelationCard
            key={relation.id}
            relation={relation}
            dbTables={dbTables}
            connection={connection}
            onUpdate={(next) =>
              onChange(relations.map((r) => (r.id === relation.id ? next : r)))
            }
            onRemove={() => onChange(relations.filter((r) => r.id !== relation.id))}
          />
        ))
      )}
    </div>
  );
}
