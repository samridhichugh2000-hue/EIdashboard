"use client";

import { useRouter } from "next/navigation";
import { TeamStats } from "@/types/employee";

interface TeamSummaryCardsProps { teams: TeamStats[]; }

const STATUS_BARS = [
  { key: "confirmed"  as const, label: "Closed",      bar: "bg-teal-500"   },
  { key: "inProgress" as const, label: "In Progress", bar: "bg-indigo-400" },
  { key: "paIssued"   as const, label: "PA Issued",   bar: "bg-amber-400"  },
  { key: "pipIssued"  as const, label: "PIP Issued",  bar: "bg-red-400"    },
];

const TEAM_META: Record<string, { dot: string; bg: string; border: string }> = {
  sales:   { dot: "bg-blue-600",  bg: "bg-blue-100",  border: "border-blue-200"  },
  trainer: { dot: "bg-pink-600",  bg: "bg-pink-100",  border: "border-pink-200"  },
  pt:      { dot: "bg-green-600", bg: "bg-green-100", border: "border-green-200" },
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
            className={`rounded-2xl border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5 cursor-pointer hover:shadow-[0_6px_24px_rgba(0,0,0,0.09)] hover:translate-y-[-2px] transition-all duration-200 ${meta.bg} ${meta.border}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-black/[0.06]">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${meta.dot} shrink-0`} />
                <span className="text-sm font-semibold text-gray-700">{team.label}</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">{team.total}</span>
                <p className="text-[10px] text-gray-400 mt-0.5">employees</p>
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
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-700">{count}</span>
                    </div>
                    <div className="h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
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
