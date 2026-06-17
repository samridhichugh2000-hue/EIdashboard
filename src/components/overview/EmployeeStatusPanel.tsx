"use client";

import { useRouter } from "next/navigation";
import { Employee } from "@/types/employee";

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  "PIP Issued":  { bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200"   },
  "PA Issued":   { bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-200" },
  "In Progress": { bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-200"  },
  "Confirmed":   { bg: "bg-green-50",  text: "text-green-600",  border: "border-green-200" },
};

const AVATAR_BG: Record<string, string> = {
  "PIP Issued":  "bg-red-100 text-red-700",
  "PA Issued":   "bg-amber-100 text-amber-700",
  "In Progress": "bg-violet-100 text-violet-700",
  "Confirmed":   "bg-green-100 text-green-700",
};

function getDueDate(doj: string): string {
  const d = new Date(doj);
  d.setDate(d.getDate() + 90);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDaysLeft(doj: string): number {
  const end = new Date(doj);
  end.setDate(end.getDate() + 90);
  const today = new Date();
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function EmployeeStatusPanel({ employees }: { employees: Employee[] }) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl shadow-sm flex flex-col" style={{ maxHeight: "calc(100vh - 160px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-50">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Employee Status</h3>
          <p className="text-xs text-gray-400 mt-0.5">Active EI employees</p>
        </div>
        <button
          onClick={() => router.push("/category/sales")}
          className="text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors px-3 py-1.5 rounded-lg"
        >
          View All
        </button>
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto flex-1 px-3 py-2">
        {employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-3xl mb-2">✓</span>
            <p className="text-sm font-medium text-gray-700">All clear</p>
            <p className="text-xs text-gray-400 mt-1">No active employees in this range</p>
          </div>
        ) : (
          <div className="space-y-1">
            {employees.map((emp) => {
              const style = STATUS_STYLE[emp.finalStatus] ?? STATUS_STYLE["In Progress"];
              const avatarStyle = AVATAR_BG[emp.finalStatus] ?? AVATAR_BG["In Progress"];
              const dueDate = getDueDate(emp.doj);
              const daysLeft = getDaysLeft(emp.doj);
              const isOverdue = daysLeft < 0;

              return (
                <div
                  key={emp.employeeId}
                  onClick={() => router.push(`/category/${emp.category}`)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {/* Avatar + name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${avatarStyle}`}>
                      {getInitials(emp.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{emp.name}</p>
                      <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                        Due {dueDate}
                        {isOverdue && <span className="text-red-500 ml-1">· Overdue</span>}
                        {!isOverdue && daysLeft <= 10 && <span className="text-amber-500 ml-1">· {daysLeft}d left</span>}
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ml-2 ${style.bg} ${style.text} ${style.border}`}>
                    {emp.finalStatus === "In Progress" ? "Being Monitored" : emp.finalStatus}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="px-5 py-3 border-t border-gray-50">
        <p className="text-[10px] text-gray-400 text-center">
          Showing {employees.length} active employee{employees.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
