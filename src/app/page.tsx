export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { OverviewStats, TeamStats, Employee } from "@/types/employee";
import KPICards from "@/components/overview/KPICards";
import Charts from "@/components/overview/Charts";
import DateRangeFilter from "@/components/DateRangeFilter";
import EmployeeStatusPanel from "@/components/overview/EmployeeStatusPanel";
import RedFlags, { RedFlagItem } from "@/components/overview/RedFlags";
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

// "17 Jun 2026" → "2026-06-17" for ISO comparison
function auditDateToISO(d: string): string {
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function buildRedFlags(employees: Employee[]) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffISO = cutoff.toISOString().split("T")[0];

  const trainerNegIncident: RedFlagItem[] = [];
  const trainerZeroSkills:  RedFlagItem[] = [];
  const trainerZeroAssignments: RedFlagItem[] = [];
  const salesNegAudit: RedFlagItem[] = [];

  for (const e of employees) {
    if (e.category === "trainer") {
      // Recent negative HR incident
      const recentNeg = e.hrIncidents
        .filter((i) => i.type === "neg" && i.date >= cutoffISO)
        .sort((a, b) => b.date.localeCompare(a.date));
      if (recentNeg.length > 0) {
        trainerNegIncident.push({ employee: e, detail: recentNeg[0].date });
      }

      // 0 active skills with tenure ≥ 30d
      const activeSkills = e.trainerSkills.filter((s) => !s.isDiscontinue).length;
      if (activeSkills === 0 && e.tenureDays >= 30) {
        trainerZeroSkills.push({ employee: e, detail: `${e.tenureDays}d` });
      }

      // 0 assignments with tenure ≥ 30d
      if (e.trainerAssignments.length === 0 && e.tenureDays >= 30) {
        trainerZeroAssignments.push({ employee: e, detail: `${e.tenureDays}d` });
      }
    }

    if (e.category === "sales") {
      // Below Satisfactory audit in last 30 days
      const recentBad = e.audits
        .filter((a) => a.rating === "Below Satisfactory" && auditDateToISO(a.date) >= cutoffISO)
        .sort((a, b) => auditDateToISO(b.date).localeCompare(auditDateToISO(a.date)));
      if (recentBad.length > 0) {
        salesNegAudit.push({ employee: e, detail: recentBad[0].date });
      }
    }
  }

  return { trainerNegIncident, trainerZeroSkills, trainerZeroAssignments, salesNegAudit };
}

const STATUS_ORDER: Record<string, number> = {
  "PIP Issued": 0,
  "PA Issued":  1,
  "In Progress": 2,
  "Confirmed":   3,
};

interface PageProps { searchParams: Promise<{ from?: string; to?: string }> }

export default async function OverviewPage({ searchParams }: PageProps) {
  const { from, to } = await searchParams;
  const all = await getEmployees();

  const employees = all.filter((e) => {
    if (e.resigned)           return false; // resigned excluded from EI totals/stats (still shown greyed on list pages)
    if (from && e.doj < from) return false;
    if (to   && e.doj > to)   return false;
    return true;
  });

  const resignedCount = all.filter((e) => {
    if (!e.resigned)           return false;
    if (from && e.doj < from) return false;
    if (to   && e.doj > to)   return false;
    return true;
  }).length;

  const { overall, teamStats, tenure } = buildStats(employees);
  const redFlags = buildRedFlags(employees);

  const statusList = [...employees]
    .filter((e) => e.finalStatus !== "Confirmed")
    .sort((a, b) => (STATUS_ORDER[a.finalStatus] ?? 4) - (STATUS_ORDER[b.finalStatus] ?? 4))
    .slice(0, 20);

  return (
    <div className="p-6">
      {/* Header banner */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6366F1] px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white">EI Performance Dashboard</h2>
          <p className="text-violet-200 text-xs mt-0.5">Manage your 90-day employee performance</p>
        </div>
        <Suspense>
          <DateRangeFilter />
        </Suspense>
      </div>

      {/* Main layout: left 2/3 + right 1/3 */}
      <div className="grid grid-cols-3 gap-4 items-start">

        {/* Left panel */}
        <div className="col-span-2 space-y-4">
          <KPICards stats={overall} resigned={resignedCount} />
          <RedFlags {...redFlags} />
          <Charts overall={overall} teams={teamStats} tenure={tenure} />
        </div>

        {/* Right panel */}
        <div className="col-span-1 sticky top-4">
          <EmployeeStatusPanel employees={statusList} />
        </div>

      </div>
    </div>
  );
}
