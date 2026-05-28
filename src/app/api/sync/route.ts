import { NextResponse } from "next/server";
import { getTursoClient, initSchema } from "@/lib/turso";
import { getEmployees } from "@/lib/data";

// POST /api/sync — clears all caches so next getEmployees() triggers a full re-sync
export async function POST() {
  try {
    await initSchema();
    const db = getTursoClient();
    await Promise.all([
      db.execute({ sql: "UPDATE employees SET cached_at = 0", args: [] }),
      db.execute({ sql: "DELETE FROM nr_data", args: [] }),
      db.execute({ sql: "DELETE FROM utilization", args: [] }),
    ]);
    await getEmployees(); // runs full sync immediately
    return NextResponse.json({ success: true, message: "Re-sync complete" });
  } catch (err) {
    console.warn("sync error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
