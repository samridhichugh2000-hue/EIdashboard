import { OverviewStats } from "@/types/employee";

interface KPICardsProps { stats: OverviewStats; }

export default function KPICards({ stats }: KPICardsProps) {
  return (
    <div className="grid grid-cols-5 gap-4">
      {/* Hero card — Total */}
      <div className="col-span-1 rounded-2xl bg-gradient-to-br from-[#28C5BE] to-[#1E99C0] p-5 shadow-lg shadow-teal-200/60 flex flex-col justify-between min-h-[110px]">
        <p className="text-sm font-medium text-white/70">Total in EI</p>
        <p className="text-5xl font-bold text-white leading-none mt-2">{stats.total}</p>
        <p className="text-xs text-white/50 mt-2">Employees</p>
      </div>

      <StatCard label="Confirmed"   value={stats.confirmed}  accent="teal"  />
      <StatCard label="In Progress" value={stats.inProgress} accent="blue"  />
      <StatCard label="PA Issued"   value={stats.paIssued}   accent="amber" />
      <StatCard label="PIP Issued"  value={stats.pipIssued}  accent="red"   />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: "teal" | "blue" | "amber" | "red" }) {
  const styles = {
    teal:  { border: "border-l-[#28C5BE]", num: "text-[#1E99C0]",  dot: "bg-[#28C5BE]"  },
    blue:  { border: "border-l-blue-400",   num: "text-blue-600",   dot: "bg-blue-400"   },
    amber: { border: "border-l-amber-400",  num: "text-amber-600",  dot: "bg-amber-400"  },
    red:   { border: "border-l-red-400",    num: "text-red-600",    dot: "bg-red-400"    },
  }[accent];

  return (
    <div className={`bg-white rounded-2xl border-l-4 ${styles.border} px-5 py-4 shadow-sm flex flex-col justify-between min-h-[110px]`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className={`text-4xl font-bold ${styles.num} mt-2`}>{value}</p>
    </div>
  );
}
