"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildDerivedFieldExample,
  buildDerivedFieldHelpText,
  buildSumFormula,
  columnDisplayLabel,
  columnKeysFromFormula,
  formatFormulaPreview,
  isSimpleSumFormula,
  numericColumns,
  suggestDerivedFieldName,
  suggestFormulaFromColumns,
} from "@/lib/derived-fields";
import type { ColumnMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPERATORS = [
  { symbol: "+", label: "Tambah" },
  { symbol: "-", label: "Kurang" },
  { symbol: "*", label: "Kali" },
  { symbol: "/", label: "Bagi" },
] as const;

interface DerivedFieldFormProps {
  baseColumns: ColumnMeta[];
  name: string;
  formula: string;
  onNameChange: (value: string) => void;
  onFormulaChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  compact?: boolean;
  className?: string;
  sourceLabel?: string;
}

export function DerivedFieldForm({
  baseColumns,
  name,
  formula,
  onNameChange,
  onFormulaChange,
  onSubmit,
  submitLabel,
  compact = false,
  className,
  sourceLabel,
}: DerivedFieldFormProps) {
  const availableNumeric = useMemo(() => numericColumns(baseColumns), [baseColumns]);
  const suggestedFormula = useMemo(
    () => suggestFormulaFromColumns(baseColumns, Math.min(availableNumeric.length, 5) || 3),
    [baseColumns, availableNumeric.length]
  );
  const example = useMemo(() => buildDerivedFieldExample(baseColumns), [baseColumns]);
  const helpText = useMemo(
    () => buildDerivedFieldHelpText(baseColumns, sourceLabel),
    [baseColumns, sourceLabel]
  );
  const namePlaceholder = useMemo(() => suggestDerivedFieldName(baseColumns), [baseColumns]);
  const selectedKeys = useMemo(
    () => columnKeysFromFormula(formula, baseColumns),
    [formula, baseColumns]
  );
  const formulaPreview = useMemo(
    () => formatFormulaPreview(formula, baseColumns),
    [formula, baseColumns]
  );

  const [manualMode, setManualMode] = useState(() => !isSimpleSumFormula(formula, baseColumns));

  useEffect(() => {
    if (formula.trim() && !isSimpleSumFormula(formula, baseColumns)) {
      setManualMode(true);
    }
  }, [formula, baseColumns]);

  const toggleColumn = (key: string) => {
    if (manualMode) {
      const trimmed = formula.trim();
      if (selectedKeys.includes(key)) {
        const nextKeys = selectedKeys.filter((k) => k !== key);
        onFormulaChange(buildSumFormula(nextKeys));
        setManualMode(false);
        return;
      }
      if (!trimmed) {
        onFormulaChange(key);
        return;
      }
      if (/[+\-*/]$/.test(trimmed)) {
        onFormulaChange(`${trimmed} ${key}`);
        return;
      }
      onFormulaChange(`${trimmed} + ${key}`);
      return;
    }

    const nextKeys = selectedKeys.includes(key)
      ? selectedKeys.filter((k) => k !== key)
      : [...selectedKeys, key];
    onFormulaChange(buildSumFormula(nextKeys));
  };

  const appendOperator = (op: string) => {
    const trimmed = formula.trim();
    if (!trimmed) return;
    if (/[+\-*/]$/.test(trimmed)) {
      onFormulaChange(`${trimmed.slice(0, -1).trimEnd()} ${op} `);
      return;
    }
    onFormulaChange(`${trimmed} ${op} `);
  };

  const canSubmit = Boolean(name.trim() && formula.trim() && availableNumeric.length > 0);
  const labelClass = compact ? "text-[10px]" : "text-[11px]";
  const inputClass = compact ? "py-1.5 text-xs" : "py-2 text-xs";

  return (
    <div className={cn("space-y-2.5", className)}>
      <p className={cn("leading-relaxed text-slate-600", labelClass)}>{helpText}</p>

      {example && (
        <p
          className={cn(
            "rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-slate-700",
            labelClass
          )}
        >
          <span className="font-sans text-slate-500">
            Contoh dari kolom numerik{sourceLabel ? ` (${sourceLabel})` : " di tabel ini"}:{" "}
          </span>
          {example.line}
        </p>
      )}

      <label className="block">
        <span className={cn("mb-1 block font-medium text-slate-700", labelClass)}>Nama kolom</span>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={namePlaceholder || "Nama kolom baru"}
          className={cn("input-field w-full font-sans", inputClass)}
        />
      </label>

      {availableNumeric.length > 0 ? (
        <div>
          <span className={cn("mb-1 block font-medium text-slate-600", labelClass)}>
            Pilih kolom
            {!manualMode && (
              <span className="font-normal text-slate-500">
                {" "}
                — klik untuk pilih / batalkan, rumus otomatis terbentuk
              </span>
            )}
          </span>
          <div className="flex flex-wrap gap-1">
            {availableNumeric.map((col) => {
              const label = columnDisplayLabel(col);
              const showKey = label !== col.key;
              const selected = selectedKeys.includes(col.key);
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => toggleColumn(col.key)}
                  title={
                    selected
                      ? `Hapus ${col.key} dari rumus`
                      : showKey
                        ? col.key
                        : `Tambah ${col.key}`
                  }
                  className={cn(
                    "rounded-lg border px-2 py-0.5 text-[10px] font-medium transition-colors",
                    selected
                      ? "border-violet-400 bg-violet-100 text-violet-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                  )}
                >
                  <span>{label}</span>
                  {showKey && (
                    <span
                      className={cn(
                        "ml-1 font-mono text-[9px]",
                        selected ? "text-violet-600" : "text-slate-400"
                      )}
                    >
                      {col.key}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className={cn("text-amber-700", labelClass)}>
          Tidak ada kolom numerik yang bisa digabungkan di tabel ini.
        </p>
      )}

      <div>
        <span className={cn("mb-1 block font-medium text-slate-700", labelClass)}>Rumus</span>
        {!manualMode ? (
          <div
            className={cn(
              "rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-slate-800",
              inputClass
            )}
          >
            {formula.trim() ? (
              formulaPreview || formula
            ) : (
              <span className="text-slate-400">Pilih kolom di atas</span>
            )}
          </div>
        ) : (
          <input
            value={formula}
            onChange={(e) => onFormulaChange(e.target.value)}
            placeholder={suggestedFormula || "pilih kolom di atas"}
            className={cn("input-field w-full font-mono", inputClass)}
            spellCheck={false}
          />
        )}
        {!manualMode && formulaPreview && formulaPreview !== formula.trim() && (
          <p className={cn("mt-1 text-slate-500", labelClass)}>
            Preview: <span className="font-mono text-slate-700">{formulaPreview}</span>
          </p>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={manualMode}
          onChange={(e) => {
            const next = e.target.checked;
            setManualMode(next);
            if (!next && selectedKeys.length > 0) {
              onFormulaChange(buildSumFormula(selectedKeys));
            }
          }}
          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        />
        <span className={cn("text-slate-600", labelClass)}>
          Edit rumus manual (operator − × ÷, kurung, dll.)
        </span>
      </label>

      {manualMode && (
        <div>
          <span className={cn("mb-1 block font-medium text-slate-600", labelClass)}>Operator</span>
          <div className="flex flex-wrap gap-1">
            {OPERATORS.map(({ symbol, label }) => (
              <button
                key={symbol}
                type="button"
                title={label}
                onClick={() => appendOperator(symbol)}
                disabled={!formula.trim()}
                className="min-w-[2rem] rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-700 hover:border-violet-300 disabled:opacity-40"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className={cn("text-slate-500", labelClass)}>
        {manualMode
          ? "Mode manual: ketik rumus sendiri. Kolom yang dipakai tetap tampil terpilih di atas."
          : "Untuk mengurangi kolom, klik lagi chip yang sudah terpilih — tidak perlu hapus manual."}
      </p>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className={cn("btn-primary w-full", compact ? "py-1.5 text-xs" : "text-xs")}
      >
        {submitLabel}
      </button>
    </div>
  );
}
