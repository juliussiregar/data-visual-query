import bcrypt from "bcryptjs";
import { query } from "@/lib/db/app-pool";
import type { AuthUser } from "@/lib/session";
import type { UserRole } from "@/lib/auth";

const SESSION_DAYS = 14;

export async function findUserByEmail(email: string) {
  const res = await query<{
    id: string;
    email: string;
    password_hash: string;
    name: string;
    role: UserRole;
  }>("SELECT id, email, password_hash, name, role FROM users WHERE email = $1", [
    email.toLowerCase().trim(),
  ]);
  return res.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const res = await query<{ id: string; email: string; name: string; role: UserRole }>(
    "SELECT id, email, name, role FROM users WHERE id = $1",
    [id]
  );
  return res.rows[0] ?? null;
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  role: UserRole = "analyst"
): Promise<AuthUser> {
  const hash = await bcrypt.hash(password, 10);
  const res = await query<{ id: string; email: string; name: string; role: UserRole }>(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role`,
    [email.toLowerCase().trim(), hash, name.trim(), role]
  );
  return res.rows[0];
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, token, expiresAt.toISOString()]
  );
  return token;
}

export async function getUserBySessionToken(token: string): Promise<AuthUser | null> {
  const res = await query<{
    id: string;
    email: string;
    name: string;
    role: UserRole;
    expires_at: Date;
  }>(
    `SELECT u.id, u.email, u.name, u.role, s.expires_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1`,
    [token]
  );
  const row = res.rows[0];
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await query("DELETE FROM sessions WHERE token = $1", [token]);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export async function deleteSession(token: string) {
  await query("DELETE FROM sessions WHERE token = $1", [token]);
}
