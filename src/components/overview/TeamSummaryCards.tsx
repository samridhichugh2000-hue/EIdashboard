"use client";

import { useRouter } from "next/navigation";
import { TeamStats } from "@/types/employee";

const TEAM_CONFIG: Record<string, { bar: string; badge: string; badgeText: string; icon: string }> = {
  sales:   { bar: "bg-violet-500", badge: "bg-violet-50",  badgeText: "text-violet-600", icon: "💼" },
  trainer: { bar: "bg-blue-500",   badge: "bg-blue-50",    badgeText: "text-blue-600",   icon: "📚" },
  pt:      { bar: "bg-emerald-500",badge: "bg-emerald-50", badgeText: "text-emerald-600",icon: "🏋️" },
};

export default function TeamSummaryCards({ teams }: { teams: TeamStats[] }) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Ongoing Teams</h3>
      </div>

      <div className="space-y-4">
        {teams.map((team) => {
          const cfg = TEAM_CONFIG[team.category];
          const closedPct = team.total > 0 ? Math.round((team.confirmed / team.total) * 100) : 0;

          return (
            <div
              key={team.category}
              onClick={() => router.push(`/category/${team.category}`)}
              className="cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none">{cfg.icon}</span>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-violet-600 transition-colors">
                    {team.label}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-gray-400">{closedPct}% closed</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge} ${cfg.badgeText}`}>
                    {team.total}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${cfg.bar} rounded-full transition-all duration-500`}
                  style={{ width: `${closedPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
