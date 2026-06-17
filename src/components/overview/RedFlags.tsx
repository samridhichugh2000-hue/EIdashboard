"use client";

import { useState } from "react";
import Link from "next/link";

export interface RedFlagItem {
  employeeId: string;
  name: string;
  detail: string;
}

interface FlagGroup {
  id: string;
  title: string;
  team: "trainer" | "sales";
  items: RedFlagItem[];
  pending?: boolean; // true = data not yet available
}

interface RedFlagsProps {
  trainerNegIncident: RedFlagItem[];
  trainerZeroSkills: RedFlagItem[];
  trainerZeroAssignments: RedFlagItem[];
  salesNegAudit: RedFlagItem[];
}

const TEAM_COLORS = {
  trainer: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-400" },
  sales:   { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-400" },
};

const SHOW_LIMIT = 4;

function FlagCard({ group }: { group: FlagGroup }) {
  const [expanded, setExpanded] = useState(false);
  const colors = TEAM_COLORS[group.team];
  const shown = expanded ? group.items : group.items.slice(0, SHOW_LIMIT);
  const overflow = group.items.length - SHOW_LIMIT;
  const isEmpty = group.items.length === 0;

  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-2 ${
      isEmpty || group.pending
        ? "bg-gray-50 border-gray-200"
        : `${colors.bg} ${colors.border}`
    }`}>
      {/* Card header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isEmpty || group.pending ? "bg-gray-300" : colors.dot}`} />
          <span className="text-xs font-semibold text-gray-800 leading-tight">{group.title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isEmpty || group.pending ? "bg-gray-100 text-gray-400" : colors.badge}`}>
            {group.team === "trainer" ? "Trainer" : "Sales"}
          </span>
          {group.pending ? (
            <span className="text-[10px] font-medium bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">soon</span>
          ) : (
            <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
              isEmpty ? "bg-gray-200 text-gray-400" : "bg-red-500 text-white"
            }`}>
              {group.items.length}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      {group.pending ? (
        <p className="text-[10px] text-gray-400 italic">API integration coming soon</p>
      ) : isEmpty ? (
        <p className="text-[10px] text-gray-400 italic">No issues detected</p>
      ) : (
        <>
          <ul className="space-y-1">
            {shown.map((item) => (
              <li key={item.employeeId} className="flex items-center justify-between gap-2">
                <Link
                  href={`/category/${group.team}`}
                  className="text-xs text-gray-700 hover:text-indigo-600 hover:underline truncate font-medium transition-colors"
                >
                  {item.name}
                </Link>
                <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">{item.detail}</span>
              </li>
            ))}
          </ul>
          {overflow > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[10px] text-gray-400 hover:text-gray-600 text-left transition-colors"
            >
              {expanded ? "Show less" : `+${overflow} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function RedFlags({
  trainerNegIncident,
  trainerZeroSkills,
  trainerZeroAssignments,
  salesNegAudit,
}: RedFlagsProps) {
  const groups: FlagGroup[] = [
    { id: "t-neg",   title: "Negative Incident (last 30d)",   team: "trainer" as const, items: trainerNegIncident },
    { id: "t-skill", title: "0 Skills Marked (≥30d tenure)",  team: "trainer" as const, items: trainerZeroSkills },
    { id: "t-asgn",  title: "0 Assignments (≥30d tenure)",    team: "trainer" as const, items: trainerZeroAssignments },
    { id: "s-audit", title: "Below Satisfactory Audit (30d)", team: "sales"   as const, items: salesNegAudit },
    { id: "s-sc",    title: "0 SCs Raised",                   team: "sales"   as const, items: [], pending: true },
    { id: "s-tech",  title: "0 Tech Calls",                   team: "sales"   as const, items: [], pending: true },
  ];

  const total = groups.filter((g) => !g.pending).reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-red-100">
          <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-gray-800">Red Flags</h3>
        <span className="ml-auto text-[10px] font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full">
          {total} {total === 1 ? "issue" : "issues"}
        </span>
      </div>

      {/* Flag cards grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {groups.map((g) => (
          <FlagCard key={g.id} group={g} />
        ))}
      </div>
    </div>
  );
}
