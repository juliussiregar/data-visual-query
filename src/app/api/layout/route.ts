import { NextRequest, NextResponse } from "next/server";
import {
  getStoredLayout,
  isLayoutStorageConfigured,
  saveStoredLayout,
} from "@/lib/layout-redis";
import type { DashboardLayout } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Parameter key wajib" }, { status: 400 });
  }

  if (!isLayoutStorageConfigured()) {
    return NextResponse.json({
      layout: null,
      configured: false,
      message: "Upstash Redis belum dikonfigurasi",
    });
  }

  const layout = await getStoredLayout(key);
  return NextResponse.json({ layout, configured: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, layout } = body ?? {};

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "Key wajib" }, { status: 400 });
    }

    if (!layout || layout.version !== 1) {
      return NextResponse.json({ error: "Layout tidak valid" }, { status: 400 });
    }

    if (!isLayoutStorageConfigured()) {
      return NextResponse.json(
        {
          error:
            "Penyimpanan cloud belum dikonfigurasi. Tambahkan UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN di Vercel.",
        },
        { status: 503 }
      );
    }

    const payload = layout as DashboardLayout;
    payload.updatedAt = new Date().toISOString();
    await saveStoredLayout(key, payload);

    return NextResponse.json({ ok: true, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan layout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
