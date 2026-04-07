import { NextResponse } from "next/server";
import { fetchPIPData, RawPIPRecord } from "@/lib/rms-auth";
import { getTursoClient } from "@/lib/turso";
import { PIPStatus } from "@/types/employee";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// GET /api/pip?empCode=3452&from=2026-01-05&to=2026-04-07
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empCode = searchParams.get("empCode");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!empCode || !from || !to) {
    return NextResponse.json({ success: false, error: "empCode, from, and to are required" }, { status: 400 });
  }

  const db = getTursoClient();
  const now = Date.now();

  // Check Turso cache
  const cached = await db.execute({
    sql: "SELECT type, issued_date, end_date FROM pip_status WHERE employee_id = ? AND cached_at > ?",
    args: [empCode, now - CACHE_TTL_MS],
  });

  if (cached.rows.length > 0) {
    const row = cached.rows[0];
    const pip: PIPStatus | null =
      row.type && row.type !== "none"
        ? { type: row.type as "PA" | "PIP", issuedDate: row.issued_date as string, endDate: row.end_date as string }
        : null;
    return NextResponse.json({ success: true, data: pip, source: "cache" });
  }

  // Fetch from RMS — API returns all records company-wide; filter by empCode
  const raw = await fetchPIPData(Number(empCode), from, to);
  const forEmployee = raw.filter((r: RawPIPRecord) => String(r.Empcode) === empCode);

  // Take the most recent active record for this employee
  const active = forEmployee.filter((r: RawPIPRecord) => r.isActive);
  const record = active.length > 0 ? active[active.length - 1] : null;

  // Map API Type to internal PIPType: "Performance Alert" → "PA", "PIP" → "PIP"
  const pipType = record
    ? (record.Type === "PIP" ? "PIP" : "PA") as "PIP" | "PA"
    : null;

  const pip: PIPStatus | null = record && pipType
    ? { type: pipType, issuedDate: record.FromDate, endDate: record.ToDate }
    : null;

  // Cache result (upsert)
  await db.execute({ sql: "DELETE FROM pip_status WHERE employee_id = ?", args: [empCode] });
  await db.execute({
    sql: "INSERT INTO pip_status (employee_id, type, issued_date, end_date, cached_at) VALUES (?, ?, ?, ?, ?)",
    args: [empCode, pip?.type ?? "none", pip?.issuedDate ?? "", pip?.endDate ?? "", now],
  });

  return NextResponse.json({ success: true, data: pip, source: "api" });
}
