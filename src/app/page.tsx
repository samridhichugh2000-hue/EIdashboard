import { OverviewStats, TeamStats } from "@/types/employee";
import KPICards from "@/components/overview/KPICards";
import TeamSummaryCards from "@/components/overview/TeamSummaryCards";
import Charts from "@/components/overview/Charts";
import { getTenureBand, categoryLabel, categoryIcon } from "@/lib/utils";
import { MOCK_EMPLOYEES } from "@/lib/mock-data";

function getOverviewData() {
  const employees = MOCK_EMPLOYEES;
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

export default function OverviewPage() {
  const { overall, teamStats, tenure } = getOverviewData();
  return (
    <div className="flex-1 p-6 space-y-5">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
        <p className="text-sm text-gray-500 mt-0.5">Aggregated view across all EI categories</p>
      </div>
      <KPICards stats={overall} />
      <TeamSummaryCards teams={teamStats} />
      <Charts overall={overall} teams={teamStats} tenure={tenure} />
    </div>
  );
}
