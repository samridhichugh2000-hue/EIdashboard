import { NextResponse } from "next/server";
import { fetchUtilizationData, RawUtilizationRecord } from "@/lib/rms-auth";
import { getTursoClient } from "@/lib/turso";
import { UtilizationEntry } from "@/types/employee";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// GET /api/utilization?empCode=3953
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empCode = searchParams.get("empCode");

  if (!empCode) {
    return NextResponse.json({ success: false, error: "empCode required" }, { status: 400 });
  }

  const db = getTursoClient();
  const now = Date.now();

  // Check Turso cache
  const cached = await db.execute({
    sql: "SELECT month, val FROM utilization WHERE employee_id = ? AND cached_at > ? ORDER BY rowid",
    args: [empCode, now - CACHE_TTL_MS],
  });

  if (cached.rows.length > 0) {
    const data: UtilizationEntry[] = cached.rows.map((r) => ({
      month: r.month as string,
      val: r.val as number,
    }));
    return NextResponse.json({ success: true, data, source: "cache" });
  }

  // Fetch from RMS
  const raw = await fetchUtilizationData(Number(empCode));
  const data: UtilizationEntry[] = raw.map((r: RawUtilizationRecord) => ({
    month: r.MonthName,
    val: r.Utilization,
  }));

  // Cache in Turso — delete stale then insert fresh
  await db.execute({ sql: "DELETE FROM utilization WHERE employee_id = ?", args: [empCode] });
  for (const entry of data) {
    await db.execute({
      sql: "INSERT INTO utilization (employee_id, month, val, cached_at) VALUES (?, ?, ?, ?)",
      args: [empCode, entry.month, entry.val, now],
    });
  }

  return NextResponse.json({ success: true, data, source: "api" });
}
