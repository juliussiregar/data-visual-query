import type { DataScope, SheetData } from "./types";
import type { UserRole } from "./auth";
import { rolePermissions } from "./auth";
import { applyDataScope, isScopeActive } from "./data-scope";
import { reanalyze } from "./filters";
import { maskRows, MASKED_VALUE } from "./pii-mask";

export interface DataPolicyContext {
  role: UserRole;
  scope: DataScope | null;
}

export function applyServerDataPolicy(data: SheetData, ctx: DataPolicyContext): SheetData {
  let result = data;

  if (isScopeActive(ctx.scope)) {
    const scopedRows = applyDataScope(result.rows, ctx.scope);
    result = reanalyze({ ...result, rows: scopedRows }, {});
  }

  if (rolePermissions(ctx.role).maskPII) {
    result = {
      ...result,
      rows: maskRows(result.rows, result.columns, true),
      columns: result.columns.map((c) =>
        c.sensitive
          ? {
              ...c,
              sampleValues: c.sampleValues.map(() => MASKED_VALUE),
            }
          : c
      ),
    };
  }

  return result;
}
