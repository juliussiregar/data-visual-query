import { NextRequest, NextResponse } from "next/server";
import { fetchSheetData, parseSheetUrl } from "@/lib/sheets";
import { analyzeSheetData } from "@/lib/analyzer";
import { mergeSheetDataSet } from "@/lib/merge-sheets";
import { joinSheetDataSets, suggestJoinConfig, computeFunnelMetrics } from "@/lib/join-sheets";
import type { UserRole } from "@/lib/auth";
import { applyServerDataPolicy } from "@/lib/data-policy";
import { AuthError, requireSessionUser } from "@/lib/session-server";
import type { DataScope, SheetData } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadSingleSheet(url: string): Promise<SheetData> {
  const rows = await fetchSheetData(url);
  return analyzeSheetData(rows, url);
}

async function loadAndPolicy(
  loader: () => Promise<SheetData>,
  role: UserRole,
  scope: DataScope | null
) {
  const raw = await loader();
  return applyServerDataPolicy(raw, { role, scope });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const body = await request.json();
    const { url, urls, merge, join, dataScope } = body ?? {};

    const role: UserRole = user.role;

    const scope: DataScope | null =
      dataScope?.columnKey && Array.isArray(dataScope.values)
        ? { columnKey: dataScope.columnKey, values: dataScope.values }
        : null;

    const sheetUrls: string[] = Array.isArray(urls)
      ? urls.filter((u): u is string => typeof u === "string" && u.trim() !== "")
      : typeof url === "string" && url.trim()
        ? [url.trim()]
        : [];

    if (sheetUrls.length === 0) {
      return NextResponse.json({ error: "URL wajib diisi" }, { status: 400 });
    }

    for (const sheetUrl of sheetUrls) {
      if (!parseSheetUrl(sheetUrl)) {
        return NextResponse.json(
          { error: `URL tidak valid: ${sheetUrl.slice(0, 60)}` },
          { status: 400 }
        );
      }
    }

    if (sheetUrls.length === 1 && !merge && !join) {
      const data = await loadAndPolicy(() => loadSingleSheet(sheetUrls[0]), role, scope);
      return NextResponse.json({ ...data, sheetUrls, mergeMode: false, joinMode: false });
    }

    const datasets = await Promise.all(sheetUrls.map((u) => loadSingleSheet(u)));

    if (join && datasets.length === 2) {
      const joinConfig = suggestJoinConfig(datasets[0], datasets[1]);
      if (joinConfig) {
        const joined = joinSheetDataSets(datasets[0], datasets[1], joinConfig);
        const data = applyServerDataPolicy(joined, { role, scope });
        const funnel = computeFunnelMetrics(datasets[0], datasets[1], joinConfig);
        return NextResponse.json({
          ...data,
          sheetUrls,
          mergeMode: false,
          joinMode: true,
          joinConfig,
          funnelMetrics: funnel,
        });
      }
    }

    const merged = mergeSheetDataSet(datasets);
    const data = applyServerDataPolicy(merged, { role, scope });

    return NextResponse.json({
      ...data,
      sheetUrls,
      mergeMode: true,
      joinMode: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Terjadi kesalahan";
    const status = message.includes("tidak valid") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
