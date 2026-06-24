import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSessionUser } from "@/lib/session-server";
import { getUserLayout, saveUserLayout } from "@/lib/db/user-sheets";
import type { DashboardLayout } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const key = request.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Parameter key wajib" }, { status: 400 });
    }
    const layout = await getUserLayout(user.id, key);
    return NextResponse.json({ layout: layout ?? null });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal memuat layout" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const body = await request.json();
    const { key, layout } = body ?? {};
    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "Key wajib" }, { status: 400 });
    }
    if (!layout || (layout as DashboardLayout).version !== 1) {
      return NextResponse.json({ error: "Layout tidak valid" }, { status: 400 });
    }
    const payload = layout as DashboardLayout;
    payload.updatedAt = new Date().toISOString();
    await saveUserLayout(user.id, key, payload);
    return NextResponse.json({ ok: true, key });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal menyimpan layout" }, { status: 500 });
  }
}
