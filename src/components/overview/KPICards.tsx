import { OverviewStats } from "@/types/employee";

interface KPICardsProps { stats: OverviewStats; }

export default function KPICards({ stats }: KPICardsProps) {
  const cards = [
    { label: "Total in EI",  value: stats.total,      color: "text-[#1E99C0]", bg: "bg-[#1E99C0]",  light: "bg-teal-50",   border: "border-teal-100"  },
    { label: "Closed",       value: stats.confirmed,  color: "text-emerald-600", bg: "bg-emerald-500", light: "bg-emerald-50", border: "border-emerald-100" },
    { label: "In Progress",  value: stats.inProgress, color: "text-blue-600",   bg: "bg-blue-500",   light: "bg-blue-50",   border: "border-blue-100"  },
    { label: "PA Issued",    value: stats.paIssued,   color: "text-amber-600",  bg: "bg-amber-500",  light: "bg-amber-50",  border: "border-amber-100" },
    { label: "PIP Issued",   value: stats.pipIssued,  color: "text-red-600",    bg: "bg-red-500",    light: "bg-red-50",    border: "border-red-100"   },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map(({ label, value, color, bg, light, border }) => (
        <div key={label} className={`bg-white rounded-2xl border ${border} px-5 py-4 shadow-sm flex flex-col gap-3`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <div className={`w-2 h-2 rounded-full ${bg}`} />
          </div>
          <p className={`text-4xl font-bold tracking-tight ${color}`}>{value}</p>
          <div className={`h-1 rounded-full ${light} overflow-hidden`}>
            <div className={`h-full ${bg} rounded-full transition-all duration-700`}
              style={{ width: cards[0].value > 0 ? `${Math.round((value / cards[0].value) * 100)}%` : "0%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
