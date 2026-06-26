import { NextRequest, NextResponse } from "next/server";
import {
  fetchSheetData,
  parseSheetUrl,
  resolveSheetDisplayName,
} from "@/lib/sheets";
import { AuthError, requireSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireSessionUser(request);
    const body = await request.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!url) {
      return NextResponse.json({ error: "URL wajib diisi" }, { status: 400 });
    }
    if (!parseSheetUrl(url)) {
      return NextResponse.json(
        { error: "URL Google Sheet tidak valid. Pastikan format link benar." },
        { status: 400 }
      );
    }

    const [rows, label] = await Promise.all([
      fetchSheetData(url),
      resolveSheetDisplayName(url),
    ]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Sheet dapat diakses tetapi tidak berisi data baris." },
        { status: 400 }
      );
    }

    const columns = Object.keys(rows[0] ?? {});
    const sampleLimit =
      typeof body?.sampleRows === "number" && body.sampleRows > 0
        ? Math.min(body.sampleRows, 50)
        : 0;
    const sampleRows = sampleLimit > 0 ? rows.slice(0, sampleLimit) : undefined;

    return NextResponse.json({
      ok: true,
      label,
      rowCount: rows.length,
      columnCount: columns.length,
      columnKeys: columns,
      ...(sampleRows ? { sampleRows } : {}),
      message: `Sheet "${label}" dapat dibuka · ${rows.length.toLocaleString("id-ID")} baris · ${columns.length} kolom`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Gagal mengakses Google Sheet";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
