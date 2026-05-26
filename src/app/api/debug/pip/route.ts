import { NextResponse } from "next/server";
import { fetchPIPData } from "@/lib/rms-auth";

// GET /api/debug/pip?empCode=3936
// Returns the raw PIP API response so we can see exactly what's coming back
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empCode = parseInt(searchParams.get("empCode") || "3936", 10);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const from = sixMonthsAgo.toISOString().split("T")[0];
  const to = new Date().toISOString().split("T")[0];

  try {
    const raw = await fetchPIPData(empCode, from, to); // uses same Type:8 as production
    return NextResponse.json({
      empCodeUsed: empCode,
      from,
      to,
      totalRecords: raw.length,
      activeRecords: raw.filter((r) => r.isActive).length,
      // Show unique employee codes found
      employeeCodes: [...new Set(raw.map((r) => String(r.Empcode)))].sort(),
      records: raw,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
