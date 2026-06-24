import { NextRequest, NextResponse } from "next/server";
import { createSession, createUser, findUserByEmail } from "@/lib/db/users";
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
    const { email, password, name } = body ?? {};
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, dan nama wajib diisi" },
        { status: 400 }
      );
    }
    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    const existing = await findUserByEmail(String(email));
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    const user = await createUser(String(email), String(password), String(name));
    const token = await createSession(user.id);
    const expires = sessionExpiryDate();
    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires));
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registrasi gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
