"use client";

import { useEffect, useRef, useState } from "react";
import { Employee } from "@/types/employee";

interface HRActionButtonProps {
  employee: Employee;
  onUpdate: (employeeId: string, confirmed: boolean, hrRemarks: string | null) => void;
}

export default function HRActionButton({ employee, onUpdate }: HRActionButtonProps) {
  const [confirmed, setConfirmed] = useState(employee.finalStatus === "Confirmed");
  const [remarks, setRemarks] = useState(employee.hrRemarks ?? "");
  const [saving, setSaving] = useState(false);
  const lastSavedRemarks = useRef(employee.hrRemarks ?? "");
  const lastSavedConfirmed = useRef(employee.finalStatus === "Confirmed");

  useEffect(() => {
    setConfirmed(employee.finalStatus === "Confirmed");
    setRemarks(employee.hrRemarks ?? "");
    lastSavedRemarks.current = employee.hrRemarks ?? "";
    lastSavedConfirmed.current = employee.finalStatus === "Confirmed";
  }, [employee.finalStatus, employee.hrRemarks]);

  async function save(newConfirmed: boolean, newRemarks: string) {
    const normalizedRemarks = newRemarks.trim() || null;
    setSaving(true);
    try {
      await fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.employeeId,
          confirmed: newConfirmed,
          hr_remarks: normalizedRemarks,
        }),
      });
      lastSavedRemarks.current = newRemarks.trim();
      lastSavedConfirmed.current = newConfirmed;
      onUpdate(employee.employeeId, newConfirmed, normalizedRemarks);
    } finally {
      setSaving(false);
    }
  }

  function handleConfirmedChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.checked;
    setConfirmed(val);
    save(val, remarks);
  }

  function handleRemarksBlur() {
    if (remarks.trim() !== lastSavedRemarks.current.trim()) {
      save(confirmed, remarks);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
      {/* Confirmed checkbox */}
      <label className="flex items-center gap-2 cursor-pointer select-none group">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={handleConfirmedChange}
          disabled={saving}
          className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 accent-green-600 cursor-pointer"
        />
        <span className={`text-xs font-medium ${confirmed ? "text-green-700" : "text-gray-500"}`}>
          {confirmed ? "Confirmed" : "Mark confirmed"}
        </span>
        {saving && <span className="text-xs text-gray-300">…</span>}
      </label>

      {/* Remarks input */}
      <input
        type="text"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        onBlur={handleRemarksBlur}
        placeholder="Add remark…"
        className="text-xs border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[#28C5BE]/50 focus:border-[#28C5BE] bg-white placeholder-gray-300"
      />
    </div>
  );
}
