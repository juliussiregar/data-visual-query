import { NextResponse } from "next/server";
import { listMockTables } from "@/lib/connectors/mock-db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    sources: listMockTables(),
    note: "PoC mock database — gunakan SQL read-only di tab SQL (role Analyst/Admin)",
  });
}
