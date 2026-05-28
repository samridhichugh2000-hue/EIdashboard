"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Employee, NREntry, PIPStatus, UtilizationEntry } from "@/types/employee";
import { formatDate, getTenureBadgeClass, getStatusChipClass } from "@/lib/utils";
import EmployeeModal from "@/components/modal/EmployeeModal";
import IncidentBadge from "@/components/IncidentBadge";
import HRActionButton from "@/components/HRActionButton";
import StatsRow from "./StatsRow";

interface EmployeeTableProps { employees: Employee[]; }

function formatNR(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000)   return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs}`;
}

function NRCell({ entry }: { entry: NREntry | undefined }) {
  if (!entry) return <span className="text-gray-300 text-xs">—</span>;
  const neg = entry.val < 0;
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] text-gray-400">{entry.month}</span>
      <span className={`text-xs font-semibold ${neg ? "text-red-600" : "text-gray-800"}`}>
        {formatNR(entry.val)}
      </span>
    </div>
  );
}

function UtilCell({ entry }: { entry: UtilizationEntry | undefined }) {
  if (!entry) return <span className="text-gray-300 text-xs">—</span>;
  const pct = entry.val;
  const color = pct >= 70 ? "text-green-700" : pct >= 40 ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] text-gray-400">{entry.month}</span>
      <span className={`text-xs font-semibold ${color}`}>{pct.toFixed(1)}%</span>
    </div>
  );
}

function FeedbackAlert({ tenureDays, feedback }: { tenureDays: number; feedback: Employee["feedback"] }) {
  if (tenureDays < 30) return <span className="text-gray-300 text-xs">—</span>;

  const missing: string[] = [];
  if (tenureDays >= 30 && !feedback.d30) missing.push("30d");
  if (tenureDays >= 60 && !feedback.d60) missing.push("60d");
  if (tenureDays >= 90 && !feedback.d90) missing.push("90d");

  if (missing.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        All feedbacks received
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      {missing.join(" / ")} not submitted
    </span>
  );
}

// "1 Apr 2026" or "30 Apr 2026" → Date (API returns D MMM YYYY)
function parsePIPDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(" ");
  if (parts.length === 3) return new Date(`${parts[1]} ${parts[0]}, ${parts[2]}`);
  return new Date(dateStr); // fallback: try native
}

function PIPChip({ pipStatus }: { pipStatus: PIPStatus | null }) {
  if (!pipStatus) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
        None
      </span>
    );
  }
  const isPIP = pipStatus.type === "PIP";
  const endDate = parsePIPDate(pipStatus.endDate);
  const isActive = !endDate || endDate >= new Date();

  return (
    <div className="flex flex-col gap-0.5">
      {isActive && (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          isPIP ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-700 border-amber-100"
        }`}>
          {pipStatus.type} Active
        </span>
      )}
      {(pipStatus.issuedDate || pipStatus.endDate) && (
        <span className={`text-xs pl-0.5 ${isActive ? "text-gray-400" : isPIP ? "text-red-400" : "text-amber-500"}`}>
          {pipStatus.type}: {pipStatus.issuedDate} – {pipStatus.endDate}
        </span>
      )}
    </div>
  );
}

export default function EmployeeTable({ employees }: EmployeeTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Employee | null>(null);
  const [employeeList, setEmployeeList] = useState<Employee[]>(employees);
  const category = employeeList[0]?.category;
  const showNR   = category === "sales";
  const showUtil = category === "trainer";
  const extraCols = (showNR || showUtil) ? 3 : 0;

  function handleHRUpdate(employeeId: string, confirmed: boolean, hrRemarks: string | null) {
    const newStatus = confirmed ? "Confirmed" as const : ("In Progress" as const);
    setEmployeeList((prev) =>
      prev.map((e) => e.employeeId === employeeId ? { ...e, finalStatus: newStatus, hrRemarks } : e)
    );
    setSelected((prev) =>
      prev?.employeeId === employeeId ? { ...prev, finalStatus: newStatus, hrRemarks } : prev
    );
  }

  const filtered = employeeList.filter((e) => {
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q);
  });

  const stats = {
    total:      filtered.length,
    confirmed:  filtered.filter((e) => e.finalStatus === "Confirmed").length,
    inProgress: filtered.filter((e) => e.finalStatus === "In Progress").length,
    paIssued:   filtered.filter((e) => e.finalStatus === "PA Issued").length,
    pipIssued:  filtered.filter((e) => e.finalStatus === "PIP Issued").length,
  };

  return (
    <div>
      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or employee ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#28C5BE]/40 focus:border-[#28C5BE] bg-white shadow-sm"
          />
        </div>
      </div>

      <StatsRow stats={stats} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Employee ID</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Department</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date of Joining</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Reporting Manager</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Tenure</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">PA / PIP</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">HR Incidents</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Feedback Alert</th>
              {(showNR || showUtil) && <>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Month 1</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Month 2</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Month 3</th>
              </>}
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Final Status</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">HR Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11 + extraCols} className="px-4 py-10 text-center text-gray-400 text-sm">No employees found</td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp.employeeId} className="hover:bg-[#f0fbfa] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{emp.employeeId}</td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => setSelected(emp)}
                      className="font-medium text-[#1E99C0] hover:text-[#28C5BE] hover:underline text-left"
                    >
                      {emp.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {emp.department || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(emp.doj)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{emp.reportingManager}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTenureBadgeClass(emp.tenureDays)}`}>
                      {emp.tenureDays}d
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <PIPChip pipStatus={emp.pipStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <IncidentBadge empCode={emp.employeeId.replace(/\D/g, "")} empName={emp.name} />
                  </td>
                  <td className="px-4 py-3">
                    <FeedbackAlert tenureDays={emp.tenureDays} feedback={emp.feedback} />
                  </td>
                  {showNR && <>
                    <td className="px-4 py-3"><NRCell entry={emp.nrData[0]} /></td>
                    <td className="px-4 py-3"><NRCell entry={emp.nrData[1]} /></td>
                    <td className="px-4 py-3"><NRCell entry={emp.nrData[2]} /></td>
                  </>}
                  {showUtil && <>
                    <td className="px-4 py-3"><UtilCell entry={emp.utilization[0]} /></td>
                    <td className="px-4 py-3"><UtilCell entry={emp.utilization[1]} /></td>
                    <td className="px-4 py-3"><UtilCell entry={emp.utilization[2]} /></td>
                  </>}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusChipClass(emp.finalStatus)}`}>
                      {emp.finalStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <HRActionButton employee={emp} onUpdate={handleHRUpdate} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <EmployeeModal
          employee={selected}
          onClose={() => { setSelected(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
