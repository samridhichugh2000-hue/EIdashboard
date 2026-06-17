import { NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";
import { fetchTrainerAssignmentData } from "@/lib/rms-auth";

export const dynamic = "force-dynamic";

// GET /api/debug/trainer-assignments?empCode=1234
// Returns raw API response + what's stored in Turso for that trainer
export async function GET(request: Request) {
  const empCode = new URL(request.url).searchParams.get("empCode");
  if (!empCode) {
    // No empCode — list all trainers from DB so caller can pick one
    const db = getTursoClient();
    const rows = await db.execute({ sql: "SELECT employee_id, name FROM employees WHERE category = 'trainer' LIMIT 10", args: [] });
    return NextResponse.json({ trainers: rows.rows });
  }

  const code = parseInt(empCode, 10);

  // Raw API response
  let apiRaw: unknown = null;
  let apiError: string | null = null;
  try {
    apiRaw = await fetchTrainerAssignmentData(code);
  } catch (err) {
    apiError = String(err);
  }

  // What's stored in Turso
  const db = getTursoClient();
  const stored = await db.execute({
    sql: "SELECT * FROM trainer_assignments WHERE employee_id = ? LIMIT 20",
    args: [String(code)],
  });

  return NextResponse.json({ empCode, apiRaw, apiError, stored: stored.rows });
}
