"use client";

import { useState } from "react";
import { Employee, PIPStatus } from "@/types/employee";
import { formatDate, getTenureBadgeClass, getStatusChipClass } from "@/lib/utils";
import EmployeeModal from "@/components/modal/EmployeeModal";
import IncidentBadge from "@/components/IncidentBadge";
import StatsRow from "./StatsRow";

interface EmployeeTableProps { employees: Employee[]; }

function PIPChip({ pipStatus }: { pipStatus: PIPStatus | null }) {
  if (!pipStatus) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
        None
      </span>
    );
  }
  const isPIP = pipStatus.type === "PIP";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
      isPIP ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-700 border-amber-100"
    }`}>
      {pipStatus.type} Active
    </span>
  );
}

export default function EmployeeTable({ employees }: EmployeeTableProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Employee | null>(null);

  const filtered = employees.filter((e) => {
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
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date of Joining</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Reporting Manager</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Tenure</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">PA / PIP</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">HR Incidents</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Final Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">No employees found</td>
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusChipClass(emp.finalStatus)}`}>
                      {emp.finalStatus}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && <EmployeeModal employee={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
