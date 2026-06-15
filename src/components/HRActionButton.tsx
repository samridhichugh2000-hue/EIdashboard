"use client";

import { useEffect, useRef, useState } from "react";
import { Employee } from "@/types/employee";

interface HRActionButtonProps {
  employee: Employee;
  onUpdate: (employeeId: string, confirmed: boolean, hrRemarks: string | null) => void;
}

export default function HRActionButton({ employee, onUpdate }: HRActionButtonProps) {
  const [confirmed, setConfirmed]     = useState(employee.finalStatus === "Confirmed");
  const [remarks, setRemarks]         = useState(employee.hrRemarks ?? "");
  const [saveState, setSaveState]     = useState<"idle" | "saving" | "saved">("idle");

  const lastSavedRemarks    = useRef(employee.hrRemarks ?? "");
  const lastSavedConfirmed  = useRef(employee.finalStatus === "Confirmed");
  const debounceTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setConfirmed(employee.finalStatus === "Confirmed");
    setRemarks(employee.hrRemarks ?? "");
    lastSavedRemarks.current    = employee.hrRemarks ?? "";
    lastSavedConfirmed.current  = employee.finalStatus === "Confirmed";
  }, [employee.finalStatus, employee.hrRemarks]);

  async function save(newConfirmed: boolean, newRemarks: string) {
    const normalizedRemarks = newRemarks.trim() || null;
    setSaveState("saving");
    try {
      await fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId:  employee.employeeId,
          confirmed:   newConfirmed,
          hr_remarks:  normalizedRemarks,
        }),
      });
      lastSavedRemarks.current   = newRemarks.trim();
      lastSavedConfirmed.current = newConfirmed;
      onUpdate(employee.employeeId, newConfirmed, normalizedRemarks);
      setSaveState("saved");
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
    }
  }

  function handleConfirmedChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.checked;
    setConfirmed(val);
    // Cancel any pending remarks debounce and save everything now
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    save(val, remarks);
  }

  function handleRemarksChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setRemarks(val);
    setSaveState("idle");

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (val.trim() !== lastSavedRemarks.current.trim()) {
        save(confirmed, val);
      }
    }, 800);
  }

  function handleRemarksBlur() {
    // Flush debounce immediately on blur
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    if (remarks.trim() !== lastSavedRemarks.current.trim()) {
      save(confirmed, remarks);
    }
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current)  clearTimeout(debounceTimer.current);
      if (savedTimerRef.current)  clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Resigned employees are read-only — no status change or remark editing
  if (employee.resigned) {
    return (
      <div className="flex flex-col gap-1 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs font-medium text-gray-500">
          {employee.finalStatus === "Confirmed" ? "Closed" : employee.finalStatus}
        </span>
        {employee.hrRemarks
          ? <span className="text-[11px] text-gray-500 italic break-words">{employee.hrRemarks}</span>
          : <span className="text-[10px] text-gray-400 italic">Resigned · read only</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
      {/* Closed checkbox */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={handleConfirmedChange}
          disabled={saveState === "saving"}
          className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 accent-green-600 cursor-pointer"
        />
        <span className={`text-xs font-medium ${confirmed ? "text-green-700" : "text-gray-500"}`}>
          {confirmed ? "Closed" : "Mark closed"}
        </span>
      </label>

      {/* Remarks input with save indicator */}
      <div className="relative">
        <input
          type="text"
          value={remarks}
          onChange={handleRemarksChange}
          onBlur={handleRemarksBlur}
          placeholder="Add remark…"
          className="text-xs border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[#28C5BE]/50 focus:border-[#28C5BE] bg-white placeholder-gray-300 pr-14"
        />
        <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium pointer-events-none transition-opacity duration-200 ${saveState === "idle" ? "opacity-0" : "opacity-100"}`}>
          {saveState === "saving" && <span className="text-gray-400">Saving…</span>}
          {saveState === "saved"  && <span className="text-green-600">✓ Saved</span>}
        </span>
      </div>
    </div>
  );
}
