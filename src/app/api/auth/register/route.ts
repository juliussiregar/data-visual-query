import { NextRequest, NextResponse } from "next/server";
import { createSession, createUser, findUserByUsername } from "@/lib/db/users";
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
    const { username, password, name } = body ?? {};
    if (!username || !password || !name) {
      return NextResponse.json(
        { error: "Username, password, dan nama wajib diisi" },
        { status: 400 }
      );
    }
    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    const normalized = String(username).trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(normalized)) {
      return NextResponse.json(
        { error: "Username 3–32 karakter: huruf, angka, titik, strip, underscore" },
        { status: 400 }
      );
    }

    const existing = await findUserByUsername(normalized);
    if (existing) {
      return NextResponse.json({ error: "Username sudah terdaftar" }, { status: 409 });
    }

    const user = await createUser(normalized, String(password), String(name));
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
