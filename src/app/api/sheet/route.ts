import { NextRequest, NextResponse } from "next/server";
import { fetchSheetData, parseSheetUrl } from "@/lib/sheets";
import { analyzeSheetData } from "@/lib/analyzer";
import { mergeSheetDataSet } from "@/lib/merge-sheets";
import type { SheetData } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadSingleSheet(url: string): Promise<SheetData> {
  const rows = await fetchSheetData(url);
  return analyzeSheetData(rows, url);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, urls, merge } = body ?? {};

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

    if (sheetUrls.length === 1 && !merge) {
      const data = await loadSingleSheet(sheetUrls[0]);
      return NextResponse.json({ ...data, sheetUrls, mergeMode: false });
    }

    const datasets = await Promise.all(sheetUrls.map((u) => loadSingleSheet(u)));
    const data = mergeSheetDataSet(datasets);

    return NextResponse.json({
      ...data,
      sheetUrls,
      mergeMode: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan";
    const status = message.includes("tidak valid") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
