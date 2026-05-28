import { NextResponse } from "next/server";
import { getEmployees } from "@/lib/data";
import { getTursoClient } from "@/lib/turso";
import { EmployeeCategory } from "@/types/employee";

// GET /api/employees?category=sales|trainer|pt
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as EmployeeCategory | null;

  try {
    const employees = await getEmployees(category ?? undefined);
    return NextResponse.json({ success: true, data: employees });
  } catch (err) {
    console.error("employees route error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch employees" }, { status: 500 });
  }
}

// PATCH /api/employees — update confirmed status and/or HR remarks for one employee
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !body.employeeId) {
    return NextResponse.json({ success: false, error: "employeeId required" }, { status: 400 });
  }

  const { employeeId, confirmed, hr_remarks } = body;
  const db = getTursoClient();

  const newStatus = confirmed ? "Confirmed" : "In Progress";
  const normalizedRemarks = typeof hr_remarks === "string" && hr_remarks.trim() ? hr_remarks.trim() : null;

  await db.execute({
    sql: "UPDATE employees SET final_status = ?, hr_remarks = ? WHERE employee_id = ?",
    args: [newStatus, normalizedRemarks, employeeId],
  });

  return NextResponse.json({ success: true });
}
