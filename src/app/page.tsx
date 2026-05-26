export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { OverviewStats, TeamStats, Employee } from "@/types/employee";
import KPICards from "@/components/overview/KPICards";
import TeamSummaryCards from "@/components/overview/TeamSummaryCards";
import Charts from "@/components/overview/Charts";
import DateRangeFilter from "@/components/DateRangeFilter";
import { getTenureBand, categoryLabel, categoryIcon } from "@/lib/utils";
import { getEmployees } from "@/lib/data";

function buildStats(employees: Employee[]) {
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
      category: cat, label: categoryLabel(cat), icon: categoryIcon(cat),
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
  return { overall, teamStats, tenure };
}

interface PageProps { searchParams: Promise<{ from?: string; to?: string }> }

export default async function OverviewPage({ searchParams }: PageProps) {
  const { from, to } = await searchParams;
  const all = await getEmployees();

  const employees = all.filter((e) => {
    if (from && e.doj < from) return false;
    if (to   && e.doj > to)   return false;
    return true;
  });

  const { overall, teamStats, tenure } = buildStats(employees);

  return (
    <div className="flex-1 p-6 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
          <p className="text-sm text-gray-500 mt-0.5">Aggregated view across all EI categories</p>
        </div>
        <Suspense>
          <DateRangeFilter />
        </Suspense>
      </div>
      <KPICards stats={overall} />
      <TeamSummaryCards teams={teamStats} />
      <Charts overall={overall} teams={teamStats} tenure={tenure} />
    </div>
  );
}
