import { NextResponse } from "next/server";
import { getSessionUserFromCookies } from "@/lib/session-server";
import { isAppDatabaseConfigured } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAppDatabaseConfigured()) {
    return NextResponse.json({ user: null, configured: false });
  }

  const user = await getSessionUserFromCookies();
  return NextResponse.json({ user, configured: true });
}
