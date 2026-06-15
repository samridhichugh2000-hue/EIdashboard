import { NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";
import { Employee, EmployeeCategory, FinalStatus } from "@/types/employee";
import { computeTenureDays } from "@/lib/utils";

// GET /api/employees/[id]  e.g. /api/employees/EMP3930
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const db = getTursoClient();
    const result = await db.execute({
      sql: "SELECT employee_id, name, category, department, doj, reporting_manager, final_status, dor, lwd, audit_count, neg_feedback_count FROM employees WHERE employee_id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }

    const r = result.rows[0];
    const doj = r.doj as string;
    const employee: Employee = {
      employeeId:       r.employee_id as string,
      name:             r.name as string,
      category:         r.category as EmployeeCategory,
      department:       (r.department as string) ?? "",
      doj,
      tenureDays:       computeTenureDays(doj),
      reportingManager: r.reporting_manager as string,
      feedback:         { d30: null, d60: null, d90: null },
      nrData:           [],
      utilization:      [],
      pipStatus:        null,
      hrIncidents:      [],
      finalStatus:      (r.final_status as string) as FinalStatus,
      resigned:          !!(r.dor as string),
      dateOfResignation: (r.dor as string) || null,
      lastWorkingDay:    (r.lwd as string) || null,
      auditCount:        Number(r.audit_count ?? 0),
      audits:            [],
      negFeedbackCount:  Number(r.neg_feedback_count ?? 0),
    };

    return NextResponse.json({ success: true, data: employee });
  } catch (err) {
    console.error("employee detail route error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch employee" }, { status: 500 });
  }
}
