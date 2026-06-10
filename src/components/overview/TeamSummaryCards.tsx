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

const TEAM_GRADIENTS: Record<string, string> = {
  sales:   "from-[#28C5BE] to-[#1E99C0]",
  trainer: "from-[#6C63FF] to-[#4F46E5]",
  pt:      "from-[#F59E0B] to-[#D97706]",
};

export default function TeamSummaryCards({ teams }: TeamSummaryCardsProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-3 gap-4">
      {teams.map((team) => (
        <div
          key={team.category}
          onClick={() => router.push(`/category/${team.category}`)}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:translate-y-[-2px] transition-all duration-200"
        >
          {/* Gradient header */}
          <div className={`rounded-xl bg-gradient-to-r ${TEAM_GRADIENTS[team.category]} p-4 mb-4 flex items-center justify-between`}>
            <span className="text-white font-semibold text-base">{team.label}</span>
            <span className="text-white font-bold text-3xl">{team.total}</span>
          </div>

          {/* Progress bars */}
          <div className="space-y-2.5">
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
      ))}
    </div>
  );
}
