import { NextResponse } from "next/server";
import { getTursoClient, initSchema } from "@/lib/turso";
import { getEmployees } from "@/lib/data";

// POST /api/sync — clears cached_at so next getEmployees() triggers a full re-sync
export async function POST() {
  try {
    await initSchema();
    const db = getTursoClient();
    await db.execute({ sql: "UPDATE employees SET cached_at = 0", args: [] });
    await getEmployees(); // runs full sync immediately
    return NextResponse.json({ success: true, message: "Re-sync complete" });
  } catch (err) {
    console.error("sync error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
