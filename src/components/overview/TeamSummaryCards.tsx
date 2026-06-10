"use client";

import { useRouter } from "next/navigation";
import { TeamStats } from "@/types/employee";

interface TeamSummaryCardsProps { teams: TeamStats[]; }

const STATUS_BARS = [
  { key: "confirmed"  as const, label: "Closed",      color: "bg-[#28C5BE]" },
  { key: "inProgress" as const, label: "In Progress", color: "bg-blue-400"  },
  { key: "paIssued"   as const, label: "PA Issued",   color: "bg-amber-400" },
  { key: "pipIssued"  as const, label: "PIP Issued",  color: "bg-red-400"   },
];

const TEAM_META: Record<string, { dot: string }> = {
  sales:   { dot: "bg-teal-500"   },
  trainer: { dot: "bg-violet-500" },
  pt:      { dot: "bg-amber-500"  },
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
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:translate-y-[-2px] transition-all duration-200"
          >
            {/* Minimal header: colored dot + label + count */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                <span className="text-sm font-semibold text-gray-700">{team.label}</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">{team.total}</span>
                <p className="text-[10px] text-gray-400 mt-0.5">employees</p>
              </div>
            </div>

            <div className="space-y-3">
              {STATUS_BARS.map(({ key, label, color }) => {
                const count = team[key];
                const pct = team.total > 0 ? Math.round((count / team.total) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-700">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
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
