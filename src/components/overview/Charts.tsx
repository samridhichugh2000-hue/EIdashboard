"use client";

import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, ResponsiveContainer,
} from "recharts";
import { OverviewStats, TeamStats } from "@/types/employee";

// Muted, darker solid colors — no opacity
const PALETTE = {
  closed:     "#0D9488",   // teal-600
  inProgress: "#4F46E5",   // indigo-600
  paIssued:   "#D97706",   // amber-600
  pipIssued:  "#B91C1C",   // red-700
};

const TEAM_PALETTE: Record<string, string> = {
  sales:   "#6366F1",   // indigo-500
  trainer: "#8B5CF6",   // violet-500
  pt:      "#D97706",   // amber-600
};

// White number rendered inside each donut slice
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DonutLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, value } = props;
  if (!value) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-(midAngle * Math.PI) / 180);
  const y = cy + r * Math.sin(-(midAngle * Math.PI) / 180);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={12} fontWeight={700}>
      {value}
    </text>
  );
}

interface ChartsProps {
  overall: OverviewStats;
  teams: TeamStats[];
  tenure: { early: number; mid: number; complete: number };
}

export default function Charts({ overall, teams, tenure }: ChartsProps) {
  const pieData = [
    { name: "Closed",      value: overall.confirmed,  color: PALETTE.closed     },
    { name: "In Progress", value: overall.inProgress,  color: PALETTE.inProgress },
    { name: "PA Issued",   value: overall.paIssued,    color: PALETTE.paIssued   },
    { name: "PIP Issued",  value: overall.pipIssued,   color: PALETTE.pipIssued  },
  ];

  const teamData = teams.map(t => ({
    name:  t.label,
    value: t.total,
    fill:  TEAM_PALETTE[t.category] ?? "#6366F1",
  }));

  const stackData = teams.map(t => ({
    name:          t.label,
    Closed:        t.confirmed,
    "In Progress": t.inProgress,
    "PA Issued":   t.paIssued,
    "PIP Issued":  t.pipIssued,
    total:         t.total,
    invisible:     0,
  }));

  const axis  = { fontSize: 11, fill: "#9CA3AF" };
  const grid  = { stroke: "rgba(0,0,0,0.05)" };
  const label = { fontSize: 12, fontWeight: 700, fill: "#374151" };

  return (
    <div className="grid grid-cols-2 gap-4">

      {/* Status Distribution — donut with white labels inside slices */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Distribution</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="42%"
                innerRadius={50}
                outerRadius={82}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={DonutLabel}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 11, color: "#6B7280" }}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Team-wise Count — bar with top labels always visible */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Team-wise Count</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamData} barCategoryGap="40%" margin={{ top: 20 }}>
              <CartesianGrid vertical={false} {...grid} />
              <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {teamData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
                <LabelList dataKey="value" position="top" style={label} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status per Team — stacked bar, total shown on top */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Status per Team</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackData} barCategoryGap="40%" margin={{ top: 20 }}>
              <CartesianGrid vertical={false} {...grid} />
              <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
              />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: "#6B7280" }} />
              <Bar dataKey="Closed"       stackId="a" fill={PALETTE.closed}     />
              <Bar dataKey="In Progress"  stackId="a" fill={PALETTE.inProgress} />
              <Bar dataKey="PA Issued"    stackId="a" fill={PALETTE.paIssued}   />
              <Bar dataKey="PIP Issued"   stackId="a" fill={PALETTE.pipIssued} radius={[4, 4, 0, 0]} />
              {/* Zero-height invisible bar just to anchor the total label on top */}
              <Bar dataKey="invisible" stackId="a" fill="transparent" legendType="none">
                <LabelList dataKey="total" position="top" style={label} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tenure Distribution — custom HTML bars (already always visible) */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Tenure Distribution</h3>
        <div className="flex flex-col gap-4">
          <TenureBar label="30 Days" sublabel="≤ 30 days"     count={tenure.early}    total={tenure.early + tenure.mid + tenure.complete} bar="bg-amber-500"  />
          <TenureBar label="60 Days" sublabel="31 – 60 days"  count={tenure.mid}      total={tenure.early + tenure.mid + tenure.complete} bar="bg-indigo-500" />
          <TenureBar label="90 Days" sublabel="61 – 90+ days" count={tenure.complete} total={tenure.early + tenure.mid + tenure.complete} bar="bg-teal-600"   />
        </div>
      </div>

    </div>
  );
}

function TenureBar({ label, sublabel, count, total, bar }: {
  label: string; sublabel: string; count: number; total: number; bar: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rounded-xl px-4 py-3 bg-[#EEF2FF]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-700">{label}</p>
          <p className="text-xs text-gray-400">{sublabel}</p>
        </div>
        <span className="text-2xl font-bold text-gray-800">{count}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
