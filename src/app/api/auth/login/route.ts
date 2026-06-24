import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  findUserByEmail,
  verifyPassword,
} from "@/lib/db/users";
import { isAppDatabaseConfigured } from "@/lib/db/app-pool";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  sessionExpiryDate,
} from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAppDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database aplikasi belum dikonfigurasi" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { email, password } = body ?? {};
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 }
      );
    }

    const row = await findUserByEmail(String(email));
    if (!row || !(await verifyPassword(String(password), row.password_hash))) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    const token = await createSession(row.id);
    const expires = sessionExpiryDate();
    const user = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
    };
    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires));
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
