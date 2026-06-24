import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSessionUser } from "@/lib/session-server";
import { resetUserWorkspace } from "@/lib/db/reset-workspace";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    await resetUserWorkspace(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal mereset data" }, { status: 500 });
  }
}
