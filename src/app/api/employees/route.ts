import { NextResponse } from "next/server";
import { getEmployees } from "@/lib/data";
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
