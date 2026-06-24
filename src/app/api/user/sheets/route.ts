import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSessionUser } from "@/lib/session-server";
import {
  deleteUserSheet,
  listUserSheets,
  upsertUserSheet,
} from "@/lib/db/user-sheets";
import { deriveSheetLabel } from "@/lib/sheet-storage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const sheets = await listUserSheets(user.id);
    return NextResponse.json({ sheets });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal memuat sheet" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const body = await request.json();
    const { url, label } = body ?? {};
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL wajib diisi" }, { status: 400 });
    }
    const sheet = await upsertUserSheet(
      user.id,
      url.trim(),
      deriveSheetLabel(url, typeof label === "string" ? label : undefined)
    );
    return NextResponse.json({ sheet });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal menyimpan sheet" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Parameter id wajib" }, { status: 400 });
    }
    await deleteUserSheet(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal menghapus sheet" }, { status: 500 });
  }
}
