import { NextResponse } from "next/server";
import { MOCK_EMPLOYEES } from "@/lib/mock-data";

// GET /api/employees/[id]
// Returns full employee detail object (used by modal)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // TODO: Replace mock with real API + Turso cache lookup
    const employee = MOCK_EMPLOYEES.find((e) => e.employeeId === id);
    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: employee });
  } catch (err) {
    console.error("employee detail route error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch employee" }, { status: 500 });
  }
}
