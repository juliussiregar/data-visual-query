import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getUserBySessionToken } from "@/lib/db/users";
import type { AuthUser } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/session";

export async function getSessionUserFromRequest(
  request: NextRequest
): Promise<AuthUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

export async function getSessionUserFromCookies(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

export async function requireSessionUser(
  request: NextRequest
): Promise<AuthUser> {
  const user = await getSessionUserFromRequest(request);
  if (!user) throw new AuthError("Login diperlukan");
  return user;
}

export class AuthError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
