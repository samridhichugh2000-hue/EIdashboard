import { NextResponse } from "next/server";
import { fetchFeedbackData } from "@/lib/rms-auth";
import { getFourMonthsAgoDate, todayAsApiDate } from "@/lib/utils";

// GET /api/feedback?employeeId=3930
// Fetches raw feedback records for one employee from RMS (or all if no id)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeName = searchParams.get("name") || "";

  try {
    const start = getFourMonthsAgoDate();
    const end = todayAsApiDate();
    const records = await fetchFeedbackData(start, end, employeeName);
    return NextResponse.json({ success: true, data: records });
  } catch (err) {
    console.error("feedback route error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch feedback" }, { status: 500 });
  }
}
