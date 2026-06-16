import { OverviewStats } from "@/types/employee";

const BREAKDOWNS = [
  { key: "confirmed"  as const, label: "Not to be monitored", dot: "bg-emerald-500", num: "text-emerald-700", bg: "bg-emerald-50"  },
  { key: "inProgress" as const, label: "In Progress",          dot: "bg-violet-500",  num: "text-violet-700",  bg: "bg-violet-50"   },
  { key: "paIssued"   as const, label: "PA Issued",            dot: "bg-amber-500",   num: "text-amber-700",   bg: "bg-amber-50"    },
  { key: "pipIssued"  as const, label: "PIP Issued",           dot: "bg-red-500",     num: "text-red-700",     bg: "bg-red-50"      },
];

export default function KPICards({ stats, resigned = 0 }: { stats: OverviewStats; resigned?: number }) {
  const values = {
    confirmed: stats.confirmed,
    inProgress: stats.inProgress,
    paIssued: stats.paIssued,
    pipIssued: stats.pipIssued,
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm px-6 py-5">
      <div className="flex items-center gap-5">

        {/* Total active */}
        <div className="shrink-0 text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Total in EI</p>
          <p className="text-5xl font-extrabold text-gray-900 leading-none tabular-nums">{stats.total}</p>
        </div>

        <div className="w-px h-14 bg-gray-100 shrink-0" />

        {/* Active breakdown */}
        <div className="flex items-center gap-2 flex-1">
          {BREAKDOWNS.map(({ key, label, dot, num, bg }) => (
            <div key={key} className={`flex-1 rounded-xl px-3 py-2.5 ${bg} flex flex-col gap-1`}>
              <p className={`text-2xl font-bold tabular-nums ${num}`}>{values[key]}</p>
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                <p className="text-[10px] font-medium text-gray-600 leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="w-px h-14 bg-gray-100 shrink-0" />

        {/* Inactive / Resigned */}
        <div className="shrink-0 rounded-xl px-3 py-2.5 bg-gray-50 flex flex-col gap-1 min-w-[90px]">
          <p className="text-2xl font-bold tabular-nums text-gray-400">{resigned}</p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-400" />
            <p className="text-[10px] font-medium text-gray-500 leading-tight">Inactive / Resigned</p>
          </div>
        </div>

      </div>
    </div>
  );
}
