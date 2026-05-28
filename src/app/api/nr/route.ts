import { NextResponse } from "next/server";
import { fetchNRData, RawNRRecord } from "@/lib/rms-auth";
import { getTursoClient } from "@/lib/turso";
import { NREntry } from "@/types/employee";

const CACHE_TTL_MS = 30 * 60 * 1000;

function parseMonth(m: string): number {
  // "Apr-2026" → comparable timestamp
  const [mon, yr] = m.split("-");
  return new Date(`${mon} 1, ${yr}`).getTime();
}

// GET /api/nr?empCode=2724
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empCode = searchParams.get("empCode");

  if (!empCode) {
    return NextResponse.json({ success: false, error: "empCode required" }, { status: 400 });
  }

  const db = getTursoClient();
  const now = Date.now();

  // Check Turso cache — return most recent 3 months
  const cached = await db.execute({
    sql: "SELECT month, val FROM nr_data WHERE employee_id = ? AND cached_at > ?",
    args: [empCode, now - CACHE_TTL_MS],
  });

  if (cached.rows.length > 0) {
    const data: NREntry[] = cached.rows
      .map((r) => ({ month: r.month as string, val: Number(r.val) }))
      .sort((a, b) => parseMonth(b.month) - parseMonth(a.month))
      .slice(0, 3);
    return NextResponse.json({ success: true, data, source: "cache" });
  }

  // Fetch from RMS
  let raw: RawNRRecord[] = [];
  try {
    raw = await fetchNRData(Number(empCode));
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 502 });
  }

  // Sort descending by month, keep 3 most recent
  const data: NREntry[] = raw
    .map((r) => ({ month: r.month, val: r.TotalNR }))
    .sort((a, b) => parseMonth(b.month) - parseMonth(a.month))
    .slice(0, 3);

  // Cache in Turso
  await db.execute({ sql: "DELETE FROM nr_data WHERE employee_id = ?", args: [empCode] });
  for (const entry of data) {
    await db.execute({
      sql: "INSERT INTO nr_data (employee_id, month, val, cached_at) VALUES (?, ?, ?, ?)",
      args: [empCode, entry.month, entry.val, now],
    });
  }

  return NextResponse.json({ success: true, data, source: "api" });
}
