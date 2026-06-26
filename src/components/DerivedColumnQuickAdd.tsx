"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { Calculator, Plus, X } from "lucide-react";
import {
  validateNewDerivedField,
  type DerivedField,
} from "@/lib/derived-fields";
import type { ColumnMeta } from "@/lib/types";
import { useDerivedFieldDraft } from "@/hooks/useDerivedFieldDraft";
import { DerivedFieldForm } from "./DerivedFieldForm";

export interface DerivedColumnQuickAddHandle {
  /** Commit draft if form is open and user has edited it. */
  commitPendingDraft: () => DerivedField | { error: string } | null;
  resetAfterCommit: () => void;
}

interface DerivedColumnQuickAddProps {
  /** Kolom mentah dari tabel sumber (tanpa kolom custom). */
  baseColumns: ColumnMeta[];
  fields: DerivedField[];
  onAdd: (field: DerivedField) => void;
  onRemove?: (field: DerivedField) => void;
  /** Label tabel — saran kolom diambil dari sini. */
  sourceLabel?: string;
  /** Data untuk validasi rumus (kolom + baris sample). */
  validationData: { columns: ColumnMeta[]; rows: Record<string, string>[] };
  className?: string;
}

export const DerivedColumnQuickAdd = forwardRef<
  DerivedColumnQuickAddHandle,
  DerivedColumnQuickAddProps
>(function DerivedColumnQuickAdd(
  { baseColumns, fields, onAdd, onRemove, sourceLabel, validationData, className },
  ref
) {
  const existingKeys = useMemo(() => new Set(fields.map((f) => f.key)), [fields]);
  const { name, setName, formula, setFormula, resetDraft } = useDerivedFieldDraft(baseColumns);
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleAdd = () => {
    if (!name.trim() || !formula.trim()) return;
    const validated = validateNewDerivedField(
      name,
      formula,
      validationData,
      fields
    );
    if (!validated.ok) return;
    onAdd(validated.field);
    resetDraft();
    setDirty(false);
    setOpen(false);
  };

  const openCreateForm = () => {
    setOpen(true);
    setDirty(true);
  };

  const closeCreateForm = () => {
    setOpen(false);
    setDirty(false);
    resetDraft();
  };

  useImperativeHandle(ref, () => ({
    commitPendingDraft: () => {
      if (!open || !dirty) return null;
      const validated = validateNewDerivedField(
        name,
        formula,
        validationData,
        fields
      );
      if (!validated.ok) return { error: validated.error };
      return validated.field;
    },
    resetAfterCommit: () => {
      resetDraft();
      setDirty(false);
      setOpen(false);
    },
  }));

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-900">
          <Calculator className="h-3.5 w-3.5 text-violet-600" />
          Kolom dihitung
        </div>
        <button
          type="button"
          onClick={() => (open ? closeCreateForm() : openCreateForm())}
          className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2 py-0.5 text-[10px] font-medium text-violet-700 hover:bg-violet-50"
        >
          <Plus className="h-3 w-3" />
          {open ? "Tutup" : "Buat kolom baru"}
        </button>
      </div>

      {fields.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {fields.map((f) => (
            <span
              key={f.id}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-violet-200 bg-violet-50 pl-2 pr-1 py-0.5 text-[10px] font-medium text-violet-800"
              title={`${f.formula}\nkey: ${f.key}`}
            >
              <span className="min-w-0 truncate">
                {f.name}{" "}
                <span className="font-mono font-normal text-violet-600">({f.key})</span>
              </span>
              {onRemove ? (
                <button
                  type="button"
                  title={`Hapus kolom ${f.name}`}
                  aria-label={`Hapus kolom ${f.name}`}
                  onClick={() => onRemove(f)}
                  className="shrink-0 rounded p-0.5 text-violet-500 hover:bg-red-100 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-2.5">
          <p className="mb-2 text-[10px] leading-relaxed text-violet-800/80">
            Kolom tersimpan ke project saat Anda klik{" "}
            <strong className="font-semibold">Tambah kolom</strong> atau{" "}
            <strong className="font-semibold">Save &amp; close</strong>.
          </p>
          <DerivedFieldForm
            baseColumns={baseColumns}
            sourceLabel={sourceLabel}
            name={name}
            formula={formula}
            onNameChange={(value) => {
              setDirty(true);
              setName(value);
            }}
            onFormulaChange={(value) => {
              setDirty(true);
              setFormula(value);
            }}
            onSubmit={handleAdd}
            submitLabel="Tambah kolom & pakai di widget"
            compact
          />
        </div>
      )}
    </div>
  );
});
