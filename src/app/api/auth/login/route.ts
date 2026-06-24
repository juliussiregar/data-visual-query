import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  findUserByUsername,
  verifyPassword,
} from "@/lib/db/users";
import { isAppDatabaseConfigured } from "@/lib/db/prisma";
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
    const { username, password } = body ?? {};
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi" },
        { status: 400 }
      );
    }

    const row = await findUserByUsername(String(username));
    if (!row || !(await verifyPassword(String(password), row.passwordHash))) {
      return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
    }

    const token = await createSession(row.id);
    const expires = sessionExpiryDate();
    const user = {
      id: row.id,
      username: row.username,
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
