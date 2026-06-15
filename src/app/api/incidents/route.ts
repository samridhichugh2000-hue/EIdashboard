import { NextResponse } from "next/server";
import { fetchIncidentData, RawIncidentRecord } from "@/lib/rms-auth";
import { getTursoClient } from "@/lib/turso";
import { HRIncident } from "@/types/employee";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// GET /api/incidents?empCode=3452
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
    sql: "SELECT type, comment, date FROM hr_incidents WHERE employee_id = ? AND cached_at > ?",
    args: [empCode, now - CACHE_TTL_MS],
  });

  if (cached.rows.length > 0) {
    const incidents: HRIncident[] = cached.rows.map((r) => ({
      type: r.type as "pos" | "neg",
      comment: r.comment as string,
      date: r.date as string,
    }));
    return NextResponse.json({ success: true, data: incidents, source: "cache" });
  }

  // Fetch from RMS
  const raw = await fetchIncidentData(Number(empCode));

  // Exclude incidents dated before this employee's joining date — emp codes get reused,
  // so an old/previous person's incidents can surface under the same code (e.g. 2023
  // incidents on a 2026 joiner). Look up DOJ and keep only incidents on/after it.
  const empRow = await db.execute({ sql: "SELECT doj FROM employees WHERE employee_id = ?", args: [`EMP${empCode}`] });
  const doj = (empRow.rows[0]?.doj as string) ?? "";

  const incidents: HRIncident[] = raw
    .map((r: RawIncidentRecord) => ({
      type: (r.IncidentType === "Positive Incident" ? "pos" : "neg") as "pos" | "neg",
      comment: r.Reason,
      date: r.IncidentDate.split("T")[0], // strip time part
    }))
    .filter((inc) => !doj || inc.date >= doj);

  // Cache in Turso — delete stale then insert fresh
  await db.execute({ sql: "DELETE FROM hr_incidents WHERE employee_id = ?", args: [empCode] });
  for (const inc of incidents) {
    await db.execute({
      sql: "INSERT INTO hr_incidents (employee_id, type, comment, date, cached_at) VALUES (?, ?, ?, ?, ?)",
      args: [empCode, inc.type, inc.comment, inc.date, now],
    });
  }

  return NextResponse.json({ success: true, data: incidents, source: "api" });
}
