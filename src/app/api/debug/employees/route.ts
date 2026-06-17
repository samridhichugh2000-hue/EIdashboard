import { NextResponse } from "next/server";
import { fetchRawEmployeeListData } from "@/lib/rms-auth";

// GET /api/debug/employees
// Returns the full raw response from apikey=47 so we can see every field the API returns
export async function GET() {
  const toDate = new Date().toISOString().split("T")[0];
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 120);
  const from = fromDate.toISOString().split("T")[0];

  try {
    const records = await fetchRawEmployeeListData(from, toDate);

    // Every unique field key seen across all records
    const allKeys = [...new Set(records.flatMap(r => Object.keys(r)))].sort();

    // Distinct values for anything that looks like a status / active / exit field
    const statusLikeFields = allKeys
      .filter(k => /status|active|resign|exit|left|employ|state|flag|isactive/i.test(k))
      .reduce((acc, k) => {
        acc[k] = [...new Set(records.map(r => r[k]))];
        return acc;
      }, {} as Record<string, unknown[]>);

    // Department breakdown
    const deptCount: Record<string, number> = {};
    for (const r of records) {
      const dept = (r["Department"] as string) || "(none)";
      deptCount[dept] = (deptCount[dept] ?? 0) + 1;
    }

    return NextResponse.json({
      dateRange: { from, to: toDate },
      totalRecords: records.length,
      departmentBreakdown: deptCount,
      allFieldKeys: allKeys,
      statusLikeFields,
      sampleRecords: records.slice(0, 5),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
