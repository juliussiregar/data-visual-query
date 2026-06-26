"use client";

import { useEffect, useState } from "react";
import { Calculator, Plus, Trash2 } from "lucide-react";
import { createDerivedField, type DerivedField } from "@/lib/derived-fields";
import type { ColumnMeta } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDerivedFieldDraft } from "@/hooks/useDerivedFieldDraft";
import { DerivedFieldForm } from "./DerivedFieldForm";

interface DerivedFieldsEditorProps {
  fields: DerivedField[];
  onChange: (fields: DerivedField[]) => void;
  onSave?: (fields: DerivedField[]) => void | Promise<void>;
  saving?: boolean;
  columns?: ColumnMeta[];
  columnsLoading?: boolean;
  sourceLabel?: string;
  className?: string;
}

export function DerivedFieldsEditor({
  fields,
  onChange,
  onSave,
  saving,
  columns = [],
  columnsLoading = false,
  sourceLabel,
  className,
}: DerivedFieldsEditorProps) {
  const { name, setName, formula, setFormula, resetDraft } = useDerivedFieldDraft(columns);
  const [showForm, setShowForm] = useState(fields.length === 0);

  useEffect(() => {
    if (!showForm && fields.length === 0) setShowForm(true);
  }, [fields.length, showForm]);

  const addField = () => {
    if (!name.trim() || !formula.trim()) return;
    onChange([...fields, createDerivedField(name, formula)]);
    resetDraft();
    setShowForm(false);
  };

  return (
    <section className={cn("rounded-xl border border-violet-200/80 bg-violet-50/30 p-4", className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <Calculator className="h-3.5 w-3.5 text-violet-600" />
            Kolom dihitung
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Buat kolom baru dari expression matematika — seperti rumus spreadsheet. Saran kolom
            mengikuti tabel sumber project. Hanya tersimpan di aplikasi, tidak ke database sumber.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-3 w-3" />
          {showForm ? "Tutup" : "Tambah kolom"}
        </button>
      </div>

      {showForm && (
        <div className="mb-3 rounded-lg border border-violet-200 bg-white p-3">
          {columnsLoading ? (
            <p className="mb-2 text-[11px] text-slate-500">Memuat kolom dari sumber data project…</p>
          ) : columns.length === 0 ? (
            <p className="mb-2 text-[11px] text-amber-800">
              Isi link sheet atau pilih tabel database di atas agar saran kolom numerik muncul.
            </p>
          ) : null}
          <DerivedFieldForm
            baseColumns={columns}
            sourceLabel={sourceLabel}
            name={name}
            formula={formula}
            onNameChange={setName}
            onFormulaChange={setFormula}
            onSubmit={addField}
            submitLabel="Tambahkan kolom"
          />
        </div>
      )}

      {fields.length === 0 ? (
        <p className="text-[11px] text-slate-500">Belum ada kolom dihitung. Klik Tambah kolom di atas.</p>
      ) : (
        <ul className="space-y-2">
          {fields.map((field) => (
            <li
              key={field.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-900">{field.name}</p>
                <p className="font-mono text-[10px] text-slate-500">{field.formula}</p>
                <p className="text-[10px] text-slate-400">key: {field.key}</p>
              </div>
              <button
                type="button"
                title="Hapus"
                onClick={() => onChange(fields.filter((f) => f.id !== field.id))}
                className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {onSave && fields.length > 0 && (
        <button
          type="button"
          disabled={saving}
          onClick={() => void onSave(fields)}
          className="btn-primary mt-3 text-xs"
        >
          {saving ? "Menyimpan…" : "Simpan kolom custom"}
        </button>
      )}
    </section>
  );
}
