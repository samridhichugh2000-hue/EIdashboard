"use client";

import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { OverviewStats, TeamStats } from "@/types/employee";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const STATUS_COLORS = {
  Confirmed:    { bg: "rgba(20, 184, 166, 0.65)",  border: "rgba(20, 184, 166, 0.9)"  },
  "In Progress":{ bg: "rgba(96, 165, 250, 0.65)",  border: "rgba(96, 165, 250, 0.9)"  },
  "PA Issued":  { bg: "rgba(251, 191, 36, 0.65)",  border: "rgba(251, 191, 36, 0.9)"  },
  "PIP Issued": { bg: "rgba(248, 113, 113, 0.65)", border: "rgba(248, 113, 113, 0.9)" },
};

interface ChartsProps {
  overall: OverviewStats;
  teams: TeamStats[];
  tenure: { early: number; mid: number; complete: number };
}

export default function Charts({ overall, teams, tenure }: ChartsProps) {
  const donutData = {
    labels: ["Closed", "In Progress", "PA Issued", "PIP Issued"],
    datasets: [{
      data: [overall.confirmed, overall.inProgress, overall.paIssued, overall.pipIssued],
      backgroundColor: Object.values(STATUS_COLORS).map((c) => c.bg),
      borderColor:     Object.values(STATUS_COLORS).map((c) => c.border),
      borderWidth: 2,
      hoverOffset: 10,
    }],
  };

  const teamCountData = {
    labels: teams.map((t) => t.label),
    datasets: [{
      label: "Employees",
      data: teams.map((t) => t.total),
      backgroundColor: "rgba(20, 184, 166, 0.6)",
      borderColor:     "rgba(20, 184, 166, 0.9)",
      borderWidth: 1.5,
      borderRadius: 6,
    }],
  };

  const stackedData = {
    labels: teams.map((t) => t.label),
    datasets: [
      { label: "Closed",      data: teams.map((t) => t.confirmed),  backgroundColor: STATUS_COLORS["Confirmed"].bg,    stack: "s" },
      { label: "In Progress", data: teams.map((t) => t.inProgress), backgroundColor: STATUS_COLORS["In Progress"].bg,  stack: "s" },
      { label: "PA Issued",   data: teams.map((t) => t.paIssued),   backgroundColor: STATUS_COLORS["PA Issued"].bg,    stack: "s" },
      { label: "PIP Issued",  data: teams.map((t) => t.pipIssued),  backgroundColor: STATUS_COLORS["PIP Issued"].bg,   stack: "s" },
    ],
  };

  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "rgba(0,0,0,0.04)" } },
      x: { grid: { display: false } },
    },
  };

  const stackedOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" as const, labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, beginAtZero: true, grid: { color: "rgba(0,0,0,0.04)" } },
    },
  };

  const donutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "right" as const, labels: { boxWidth: 12, font: { size: 11 }, padding: 16 } },
    },
    cutout: "65%",
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Distribution</h3>
        <div className="h-52">
          <Doughnut data={donutData} options={donutOpts} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Team-wise Count</h3>
        <div className="h-52">
          <Bar data={teamCountData} options={barOpts} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Status per Team</h3>
        <div className="h-52">
          <Bar data={stackedData} options={stackedOpts} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Tenure Distribution</h3>
        <div className="flex flex-col gap-4">
          <TenureBar label="30 Days"  sublabel="≤ 30 days"    count={tenure.early}    total={tenure.early + tenure.mid + tenure.complete} color="amber" />
          <TenureBar label="60 Days"  sublabel="31 – 60 days" count={tenure.mid}      total={tenure.early + tenure.mid + tenure.complete} color="blue"  />
          <TenureBar label="90 Days"  sublabel="61 – 90+ days" count={tenure.complete} total={tenure.early + tenure.mid + tenure.complete} color="teal"  />
        </div>
      </div>
    </div>
  );
}

function TenureBar({ label, sublabel, count, total, color }: {
  label: string; sublabel: string; count: number; total: number; color: "amber" | "blue" | "teal";
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const bar = { amber: "bg-amber-400", blue: "bg-blue-400", teal: "bg-teal-500" }[color];

  return (
    <div className="rounded-xl px-4 py-3 bg-[#F4F7FE]">
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
