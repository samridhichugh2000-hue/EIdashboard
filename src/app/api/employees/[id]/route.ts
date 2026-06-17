import { NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";
import { Employee, EmployeeCategory, FinalStatus, TrainerSkill } from "@/types/employee";
import { computeTenureDays } from "@/lib/utils";

// GET /api/employees/[id]  e.g. /api/employees/EMP3930
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const db = getTursoClient();
    const empCode = id.replace(/\D/g, "");

    const [result, skillRows] = await Promise.all([
      db.execute({
        sql: "SELECT employee_id, name, category, department, doj, reporting_manager, final_status, dor, lwd, audit_count, neg_feedback_count FROM employees WHERE employee_id = ?",
        args: [id],
      }),
      db.execute({
        sql: "SELECT course_id, course_name, is_duplicate, is_discontinue FROM trainer_skills WHERE employee_id = ? ORDER BY course_name",
        args: [empCode],
      }),
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }

    const r = result.rows[0];
    const doj = r.doj as string;

    const trainerSkills: TrainerSkill[] = skillRows.rows.map((s) => ({
      courseId:      s.course_id as number | null,
      courseName:    (s.course_name as string | null),
      isDuplicate:   Boolean(s.is_duplicate),
      isDiscontinue: Boolean(s.is_discontinue),
    }));

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
      trainerAssignments: [],
      trainerSkills,
    };

    return NextResponse.json({ success: true, data: employee });
  } catch (err) {
    console.error("employee detail route error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch employee" }, { status: 500 });
  }
}
