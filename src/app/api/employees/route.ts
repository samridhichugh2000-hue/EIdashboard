import { NextResponse } from "next/server";
import { MOCK_EMPLOYEES } from "@/lib/mock-data";
import { EmployeeCategory } from "@/types/employee";

// GET /api/employees?category=sales|trainer|pt
// Returns employee list for a given category (or all if no category)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as EmployeeCategory | null;

  try {
    // TODO: Replace mock with real PMS Employee Master API + Turso cache
    let employees = MOCK_EMPLOYEES;
    if (category) {
      employees = employees.filter((e) => e.category === category);
    }
    return NextResponse.json({ success: true, data: employees });
  } catch (err) {
    console.error("employees route error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch employees" }, { status: 500 });
  }
}
