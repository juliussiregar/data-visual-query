"use client";

import { useMemo, useState } from "react";
import { Calculator, Plus } from "lucide-react";
import { createDerivedField, type DerivedField } from "@/lib/derived-fields";
import type { ColumnMeta } from "@/lib/types";
import { useDerivedFieldDraft } from "@/hooks/useDerivedFieldDraft";
import { DerivedFieldForm } from "./DerivedFieldForm";

interface DerivedColumnQuickAddProps {
  /** Kolom mentah dari tabel sumber (tanpa kolom custom). */
  baseColumns: ColumnMeta[];
  fields: DerivedField[];
  onAdd: (field: DerivedField) => void;
  /** Label tabel — saran kolom diambil dari sini. */
  sourceLabel?: string;
  className?: string;
}

export function DerivedColumnQuickAdd({
  baseColumns,
  fields,
  onAdd,
  sourceLabel,
  className,
}: DerivedColumnQuickAddProps) {
  const existingKeys = useMemo(() => new Set(fields.map((f) => f.key)), [fields]);
  const { name, setName, formula, setFormula, resetDraft } = useDerivedFieldDraft(baseColumns);
  const [open, setOpen] = useState(fields.length === 0);

  const handleAdd = () => {
    if (!name.trim() || !formula.trim()) return;
    const field = createDerivedField(name, formula);
    if (existingKeys.has(field.key)) return;
    onAdd(field);
    resetDraft();
    setOpen(false);
  };

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-900">
          <Calculator className="h-3.5 w-3.5 text-violet-600" />
          Kolom dihitung
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2 py-0.5 text-[10px] font-medium text-violet-700 hover:bg-violet-50"
        >
          <Plus className="h-3 w-3" />
          {open ? "Tutup" : "Buat kolom baru"}
        </button>
      </div>

      {fields.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {fields.map((f) => (
            <span
              key={f.id}
              className="rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-800"
              title={f.formula}
            >
              {f.name}{" "}
              <span className="font-mono font-normal text-violet-600">({f.key})</span>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-2.5">
          <DerivedFieldForm
            baseColumns={baseColumns}
            sourceLabel={sourceLabel}
            name={name}
            formula={formula}
            onNameChange={setName}
            onFormulaChange={setFormula}
            onSubmit={handleAdd}
            submitLabel="Tambah kolom & pakai di widget"
            compact
          />
        </div>
      )}
    </div>
  );
}
