"use client";

import { useRouter } from "next/navigation";
import { TeamStats } from "@/types/employee";

interface TeamSummaryCardsProps { teams: TeamStats[]; }

const TEAM_META: Record<string, { dot: string }> = {
  sales:   { dot: "bg-teal-500"   },
  trainer: { dot: "bg-violet-500" },
  pt:      { dot: "bg-amber-500"  },
};

const STATS = [
  {
    key:      "confirmed"  as const,
    label:    "Closed",
    dot:      "bg-teal-500",
    numColor: "text-teal-700",
    baseBg:   "bg-gray-50",
    alertBg:  "",
    bar:      "bg-teal-500",
  },
  {
    key:      "inProgress" as const,
    label:    "In Progress",
    dot:      "bg-indigo-500",
    numColor: "text-indigo-700",
    baseBg:   "bg-gray-50",
    alertBg:  "",
    bar:      "bg-indigo-500",
  },
  {
    key:      "paIssued"   as const,
    label:    "PA Issued",
    dot:      "bg-amber-500",
    numColor: "text-amber-700",
    baseBg:   "bg-gray-50",
    alertBg:  "bg-amber-50",
    bar:      "bg-amber-400",
  },
  {
    key:      "pipIssued"  as const,
    label:    "PIP Issued",
    dot:      "bg-red-500",
    numColor: "text-red-700",
    baseBg:   "bg-gray-50",
    alertBg:  "bg-red-50",
    bar:      "bg-red-500",
  },
];

export default function TeamSummaryCards({ teams }: TeamSummaryCardsProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-3 gap-4">
      {teams.map((team) => {
        const meta = TEAM_META[team.category];
        return (
          <div
            key={team.category}
            onClick={() => router.push(`/category/${team.category}`)}
            className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5 cursor-pointer hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:translate-y-[-2px] transition-all duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${meta.dot} shrink-0`} />
                <span className="text-sm font-semibold text-gray-700">{team.label}</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">{team.total}</span>
                <p className="text-[10px] text-gray-400 mt-0.5">employees</p>
              </div>
            </div>

            {/* 2×2 stat grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {STATS.map(({ key, label, dot, numColor, baseBg, alertBg, }) => {
                const count = team[key];
                const bg = (alertBg && count > 0) ? alertBg : baseBg;
                return (
                  <div key={key} className={`rounded-xl px-3 py-2.5 ${bg}`}>
                    <p className={`text-2xl font-bold ${numColor} leading-none`}>{count}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
                      <p className="text-[10px] font-medium text-gray-500 leading-none">{label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mini stacked proportion bar */}
            <div className="h-1.5 rounded-full overflow-hidden flex gap-px bg-gray-100">
              {STATS.map(({ key, bar }) => {
                const pct = team.total > 0 ? (team[key] / team.total) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={key}
                    className={`h-full ${bar} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
