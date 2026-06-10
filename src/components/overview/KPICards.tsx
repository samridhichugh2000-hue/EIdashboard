import { OverviewStats } from "@/types/employee";

const RINGS = [
  { key: "confirmed"  as const, label: "Closed",      stroke: "#10B981", track: "#D1FAE5" },
  { key: "inProgress" as const, label: "In Progress", stroke: "#6C63FF", track: "#EDE9FE" },
  { key: "paIssued"   as const, label: "PA Issued",   stroke: "#F59E0B", track: "#FEF3C7" },
  { key: "pipIssued"  as const, label: "PIP Issued",  stroke: "#EF4444", track: "#FEE2E2" },
];

function CircleRing({ value, total, stroke, track, label }: {
  value: number; total: number; stroke: string; track: string; label: string;
}) {
  const pct = total > 0 ? value / total : 0;
  const r = 24;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[60px] h-[60px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r={r} fill="none" stroke={track} strokeWidth="5" />
          <circle cx="30" cy="30" r={r} fill="none" stroke={stroke} strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
          {value}
        </span>
      </div>
      <span className="text-[11px] text-gray-500 text-center leading-tight whitespace-nowrap">{label}</span>
    </div>
  );
}

export default function KPICards({ stats }: { stats: OverviewStats }) {
  const values: Record<string, number> = {
    confirmed: stats.confirmed,
    inProgress: stats.inProgress,
    paIssued: stats.paIssued,
    pipIssued: stats.pipIssued,
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm px-6 py-5">
      <div className="flex items-center justify-between gap-6">
        {/* Left: big total */}
        <div className="shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Total in EI</p>
          <p className="text-6xl font-extrabold text-gray-900 leading-none tabular-nums">{stats.total}</p>
          <p className="text-xs text-gray-400 mt-2">Active employees</p>
        </div>

        {/* Divider */}
        <div className="w-px h-16 bg-gray-100 shrink-0" />

        {/* Right: mini rings */}
        <div className="flex items-center gap-6 flex-1 justify-around">
          {RINGS.map(({ key, label, stroke, track }) => (
            <CircleRing
              key={key}
              value={values[key]}
              total={stats.total}
              stroke={stroke}
              track={track}
              label={label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
