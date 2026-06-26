"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  isFormulaCompatibleWithColumns,
  numericColumns,
  numericColumnsSchemaKey,
  suggestDerivedFieldName,
  suggestFormulaFromColumns,
} from "@/lib/derived-fields";
import type { ColumnMeta } from "@/lib/types";

/** State form kolom dihitung — saran mengikuti kolom tabel aktif, reset saat schema berubah. */
export function useDerivedFieldDraft(baseColumns: ColumnMeta[]) {
  const schemaKey = useMemo(() => numericColumnsSchemaKey(baseColumns), [baseColumns]);
  const suggestedFormula = useMemo(() => {
    const count = numericColumns(baseColumns).length;
    return suggestFormulaFromColumns(baseColumns, Math.min(count, 5) || 3);
  }, [baseColumns]);
  const suggestedName = useMemo(() => suggestDerivedFieldName(baseColumns), [baseColumns]);

  const [name, setName] = useState("");
  const [formula, setFormula] = useState("");
  const prevSchemaKey = useRef<string | null>(null);

  useEffect(() => {
    const schemaChanged = prevSchemaKey.current !== null && prevSchemaKey.current !== schemaKey;
    prevSchemaKey.current = schemaKey;

    setFormula((prev) => {
      if (schemaChanged || !prev.trim() || !isFormulaCompatibleWithColumns(prev, baseColumns)) {
        return suggestedFormula;
      }
      return prev;
    });

    setName((prev) => {
      if (schemaChanged || !prev.trim()) return suggestedName;
      return prev;
    });
  }, [schemaKey, suggestedFormula, suggestedName, baseColumns]);

  const resetDraft = () => {
    setName(suggestedName);
    setFormula(suggestedFormula);
  };

  return {
    name,
    setName,
    formula,
    setFormula,
    suggestedFormula,
    suggestedName,
    schemaKey,
    resetDraft,
  };
}
