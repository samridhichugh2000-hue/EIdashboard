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

  // Turso uses "EMP{number}" as employee_id (matches syncPIP in data.ts)
  const employeeId = `EMP${empCode}`;

  const db = getTursoClient();
  const now = Date.now();

  // Check Turso cache
  const cached = await db.execute({
    sql: "SELECT type, issued_date, end_date FROM pip_status WHERE employee_id = ? AND cached_at > ?",
    args: [employeeId, now - CACHE_TTL_MS],
  });

  if (cached.rows.length > 0) {
    const row = cached.rows[0];
    const pip: PIPStatus | null =
      row.type && row.type !== "none"
        ? { type: row.type as "PA" | "PIP", issuedDate: row.issued_date as string, endDate: row.end_date as string }
        : null;
    return NextResponse.json({ success: true, data: pip, source: "cache" });
  }

  // Must use the HR service account — the API only returns company-wide data for privileged codes
  const SERVICE_CODE = parseInt(process.env.RMS_PIP_EMPCODE || "3936", 10);
  const raw = await fetchPIPData(SERVICE_CODE, from, to);
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

  // Upsert using EMP-prefixed key so this write is visible to syncPIP and readEmployees
  await db.execute({
    sql: `INSERT INTO pip_status (employee_id, type, issued_date, end_date, cached_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(employee_id) DO UPDATE SET
            type        = excluded.type,
            issued_date = excluded.issued_date,
            end_date    = excluded.end_date,
            cached_at   = excluded.cached_at`,
    args: [employeeId, pip?.type ?? "none", pip?.issuedDate ?? "", pip?.endDate ?? "", now],
  });

  // Also update final_status in employees table to stay consistent
  if (pip) {
    const newStatus = pip.type === "PIP" ? "PIP Issued" : "PA Issued";
    await db.execute({
      sql: `UPDATE employees SET final_status = ? WHERE employee_id = ? AND final_status != 'Confirmed'`,
      args: [newStatus, employeeId],
    });
  } else {
    await db.execute({
      sql: `UPDATE employees SET final_status = 'In Progress'
            WHERE employee_id = ? AND final_status IN ('PA Issued', 'PIP Issued')`,
      args: [employeeId],
    });
  }

  return NextResponse.json({ success: true, data: pip, source: "api" });
}
