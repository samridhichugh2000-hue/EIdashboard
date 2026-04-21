import { NextResponse } from "next/server";
import { getEmployees } from "@/lib/data";
import { OverviewStats, TeamStats } from "@/types/employee";
import { categoryLabel, categoryIcon, getTenureBand } from "@/lib/utils";

// GET /api/overview
export async function GET() {
  try {
    const employees = await getEmployees();

    const overall: OverviewStats = {
      total:      employees.length,
      confirmed:  employees.filter((e) => e.finalStatus === "Confirmed").length,
      inProgress: employees.filter((e) => e.finalStatus === "In Progress").length,
      paIssued:   employees.filter((e) => e.finalStatus === "PA Issued").length,
      pipIssued:  employees.filter((e) => e.finalStatus === "PIP Issued").length,
    };

    const categories = ["sales", "trainer", "pt"] as const;
    const teamStats: TeamStats[] = categories.map((cat) => {
      const team = employees.filter((e) => e.category === cat);
      return {
        category: cat,
        label:      categoryLabel(cat),
        icon:       categoryIcon(cat),
        total:      team.length,
        confirmed:  team.filter((e) => e.finalStatus === "Confirmed").length,
        inProgress: team.filter((e) => e.finalStatus === "In Progress").length,
        paIssued:   team.filter((e) => e.finalStatus === "PA Issued").length,
        pipIssued:  team.filter((e) => e.finalStatus === "PIP Issued").length,
      };
    });

    const tenure = {
      early:    employees.filter((e) => getTenureBand(e.tenureDays) === "early").length,
      mid:      employees.filter((e) => getTenureBand(e.tenureDays) === "mid").length,
      complete: employees.filter((e) => getTenureBand(e.tenureDays) === "complete").length,
    };

    return NextResponse.json({ success: true, data: { overall, teamStats, tenure } });
  } catch (err) {
    console.error("overview route error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch overview" }, { status: 500 });
  }
}
