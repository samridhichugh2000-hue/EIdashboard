"use client";

import { useRouter } from "next/navigation";
import { TeamStats } from "@/types/employee";

interface TeamSummaryCardsProps { teams: TeamStats[]; }

const STATUS_BARS = [
  { key: "confirmed"  as const, label: "Closed",      bar: "bg-white/70" },
  { key: "inProgress" as const, label: "In Progress", bar: "bg-white/55" },
  { key: "paIssued"   as const, label: "PA Issued",   bar: "bg-white/40" },
  { key: "pipIssued"  as const, label: "PIP Issued",  bar: "bg-white/30" },
];

const TEAM_META: Record<string, { bg: string }> = {
  sales:   { bg: "bg-blue-500"    },
  trainer: { bg: "bg-violet-500"  },
  pt:      { bg: "bg-emerald-500" },
};

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
            className={`rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] p-5 cursor-pointer hover:shadow-[0_8px_32px_rgba(0,0,0,0.18)] hover:translate-y-[-2px] transition-all duration-200 ${meta.bg}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/20">
              <span className="text-sm font-semibold text-white">{team.label}</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-white">{team.total}</span>
                <p className="text-[10px] text-white/60 mt-0.5">employees</p>
              </div>
            </div>

            {/* Progress bars */}
            <div className="space-y-3">
              {STATUS_BARS.map(({ key, label, bar }) => {
                const count = team[key];
                const pct = team.total > 0 ? Math.round((count / team.total) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/70">{label}</span>
                      <span className="font-semibold text-white">{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bar} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
