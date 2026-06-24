import type { UserRole } from "@/lib/auth";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export const SESSION_COOKIE = "sv-session";
export const SESSION_DAYS = 14;

export function sessionExpiryDate(): Date {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}
