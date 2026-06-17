import { OverviewStats } from "@/types/employee";

interface StatsRowProps { stats: OverviewStats; }

export default function StatsRow({ stats }: StatsRowProps) {
  const items = [
    { label: "Total",       value: stats.total,      accent: "bg-[#28C5BE]",  text: "text-[#1E99C0]"  },
    { label: "Confirmed",   value: stats.confirmed,   accent: "bg-teal-400",   text: "text-teal-700"   },
    { label: "Being Monitored", value: stats.inProgress,  accent: "bg-blue-400",   text: "text-blue-700"   },
    { label: "PA Issued",   value: stats.paIssued,    accent: "bg-amber-400",  text: "text-amber-700"  },
    { label: "PIP Issued",  value: stats.pipIssued,   accent: "bg-red-400",    text: "text-red-700"    },
  ];
  return (
    <div className="flex gap-3 mb-4 flex-wrap">
      {items.map(({ label, value, accent, text }) => (
        <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3 flex items-center gap-3 min-w-[100px]">
          <span className={`w-2.5 h-2.5 rounded-full ${accent} shrink-0`} />
          <div>
            <p className={`text-xl font-bold ${text}`}>{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
