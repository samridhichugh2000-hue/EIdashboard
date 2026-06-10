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

const TEAM_META: Record<string, { dot: string; iconBg: string; iconColor: string }> = {
  sales:   { dot: "bg-teal-500",   iconBg: "bg-[#EBF8FF]",  iconColor: "text-[#28C5BE]"   },
  trainer: { dot: "bg-violet-500", iconBg: "bg-violet-50",  iconColor: "text-violet-500"  },
  pt:      { dot: "bg-amber-500",  iconBg: "bg-amber-50",   iconColor: "text-amber-500"   },
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
            className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5 cursor-pointer hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:translate-y-[-2px] transition-all duration-200"
          >
            {/* Header: icon chip + label + big count */}
            <div className="flex items-start justify-between mb-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${meta.iconBg} flex items-center justify-center shrink-0`}>
                  <svg className={`w-4.5 h-4.5 ${meta.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-700">{team.label}</span>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-gray-900">{team.total}</span>
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
