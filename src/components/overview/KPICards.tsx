import { OverviewStats } from "@/types/employee";

interface KPICardsProps { stats: OverviewStats; }

const CARD_CONFIG = [
  {
    key: "total" as const,
    label: "Total in EI",
    iconBg: "bg-[#EEF2FF]",
    barColor: "bg-[#28C5BE]",
    icon: (
      <svg className="w-5 h-5 text-[#28C5BE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: "confirmed" as const,
    label: "Closed",
    iconBg: "bg-emerald-50",
    barColor: "bg-emerald-500",
    icon: (
      <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "inProgress" as const,
    label: "In Progress",
    iconBg: "bg-blue-50",
    barColor: "bg-blue-500",
    icon: (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "paIssued" as const,
    label: "PA Issued",
    iconBg: "bg-amber-50",
    barColor: "bg-amber-400",
    icon: (
      <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    key: "pipIssued" as const,
    label: "PIP Issued",
    iconBg: "bg-red-50",
    barColor: "bg-red-400",
    icon: (
      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function KPICards({ stats }: KPICardsProps) {
  const values: Record<string, number> = {
    total: stats.total,
    confirmed: stats.confirmed,
    inProgress: stats.inProgress,
    paIssued: stats.paIssued,
    pipIssued: stats.pipIssued,
  };
  const total = stats.total;

  return (
    <div className="grid grid-cols-5 gap-4">
      {CARD_CONFIG.map(({ key, label, iconBg, barColor, icon }) => {
        const value = values[key];
        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
        return (
          <div key={key} className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                {pct}%
              </span>
            </div>
            <div>
              <p className="text-4xl font-bold text-gray-900 tracking-tight leading-none">{value}</p>
              <p className="text-xs font-medium text-gray-500 mt-2">{label}</p>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
