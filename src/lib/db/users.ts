import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db/prisma";
import type { AuthUser } from "@/lib/session";
import type { UserRole } from "@/lib/auth";
import { isUserRole } from "@/lib/auth";

const SESSION_DAYS = 14;

function toAuthUser(user: {
  id: string;
  username: string;
  name: string;
  role: string;
}): AuthUser {
  const role: UserRole = isUserRole(user.role) ? user.role : "analyst";
  return { id: user.id, username: user.username, name: user.name, role };
}

export async function findUserByUsername(username: string) {
  return getPrisma().user.findUnique({
    where: { username: username.trim().toLowerCase() },
  });
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const user = await getPrisma().user.findUnique({
    where: { id },
    select: { id: true, username: true, name: true, role: true },
  });
  return user ? toAuthUser(user) : null;
}

export async function createUser(
  username: string,
  password: string,
  name: string,
  role: UserRole = "analyst"
): Promise<AuthUser> {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await getPrisma().user.create({
    data: {
      username: username.trim().toLowerCase(),
      passwordHash,
      name: name.trim(),
      role,
    },
    select: { id: true, username: true, name: true, role: true },
  });
  return toAuthUser(user);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await getPrisma().session.create({
    data: { userId, token, expiresAt },
  });
  return token;
}

export async function getUserBySessionToken(token: string): Promise<AuthUser | null> {
  const session = await getPrisma().session.findUnique({
    where: { token },
    include: {
      user: { select: { id: true, username: true, name: true, role: true } },
    },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await getPrisma().session.delete({ where: { token } });
    return null;
  }
  return toAuthUser(session.user);
}

export async function deleteSession(token: string) {
  await getPrisma().session.deleteMany({ where: { token } });
}
