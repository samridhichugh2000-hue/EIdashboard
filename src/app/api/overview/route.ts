import { NextResponse } from "next/server";
import { MOCK_EMPLOYEES } from "@/lib/mock-data";
import { OverviewStats, TeamStats } from "@/types/employee";
import { categoryLabel, categoryIcon, getTenureBand } from "@/lib/utils";

// GET /api/overview
// Returns aggregated stats for the Overview screen
export async function GET() {
  try {
    // TODO: Replace mock with real data from Turso
    const employees = MOCK_EMPLOYEES;

    const total = employees.length;
    const confirmed = employees.filter((e) => e.finalStatus === "Confirmed").length;
    const inProgress = employees.filter((e) => e.finalStatus === "In Progress").length;
    const paIssued = employees.filter((e) => e.finalStatus === "PA Issued").length;
    const pipIssued = employees.filter((e) => e.finalStatus === "PIP Issued").length;

    const overall: OverviewStats = { total, confirmed, inProgress, paIssued, pipIssued };

    const categories = ["sales", "trainer", "pt"] as const;
    const teamStats: TeamStats[] = categories.map((cat) => {
      const team = employees.filter((e) => e.category === cat);
      return {
        category: cat,
        label: categoryLabel(cat),
        icon: categoryIcon(cat),
        total: team.length,
        confirmed: team.filter((e) => e.finalStatus === "Confirmed").length,
        inProgress: team.filter((e) => e.finalStatus === "In Progress").length,
        paIssued: team.filter((e) => e.finalStatus === "PA Issued").length,
        pipIssued: team.filter((e) => e.finalStatus === "PIP Issued").length,
      };
    });

    const tenure = {
      early: employees.filter((e) => getTenureBand(e.tenureDays) === "early").length,
      mid: employees.filter((e) => getTenureBand(e.tenureDays) === "mid").length,
      complete: employees.filter((e) => getTenureBand(e.tenureDays) === "complete").length,
    };

    return NextResponse.json({ success: true, data: { overall, teamStats, tenure } });
  } catch (err) {
    console.error("overview route error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch overview" }, { status: 500 });
  }
}
