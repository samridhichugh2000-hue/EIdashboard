import { OverviewStats } from "@/types/employee";

interface KPICardsProps { stats: OverviewStats; }

const CARD_CONFIG = [
  { key: "total",      label: "Total in EI",  dot: "bg-[#28C5BE]",    bar: "bg-[#28C5BE]"    },
  { key: "confirmed",  label: "Closed",        dot: "bg-emerald-500",  bar: "bg-emerald-500"  },
  { key: "inProgress", label: "In Progress",   dot: "bg-blue-500",     bar: "bg-blue-500"     },
  { key: "paIssued",   label: "PA Issued",     dot: "bg-amber-400",    bar: "bg-amber-400"    },
  { key: "pipIssued",  label: "PIP Issued",    dot: "bg-red-400",      bar: "bg-red-400"      },
];

export default function KPICards({ stats }: KPICardsProps) {
  const values: Record<string, number> = {
    total:      stats.total,
    confirmed:  stats.confirmed,
    inProgress: stats.inProgress,
    paIssued:   stats.paIssued,
    pipIssued:  stats.pipIssued,
  };
  const total = stats.total;

  return (
    <div className="grid grid-cols-5 gap-4">
      {CARD_CONFIG.map(({ key, label, dot, bar }) => {
        const value = values[key];
        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
        return (
          <div key={key} className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-4 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
                <p className="text-xs font-medium text-gray-500">{label}</p>
              </div>
              <span className="text-[10px] font-semibold text-gray-400 tabular-nums">{pct}%</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight leading-none">{value}</p>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${bar} rounded-full transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
