"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Employee, NREntry, PIPStatus, UtilizationEntry } from "@/types/employee";
import { formatDate, getTenureBadgeClass, getStatusChipClass, getFeedbackQuality } from "@/lib/utils";
import EmployeeModal from "@/components/modal/EmployeeModal";
import IncidentBadge from "@/components/IncidentBadge";
import HRActionButton from "@/components/HRActionButton";


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

type ClarifySendState = "idle" | "sending" | "sent" | "error";

function ClarifyButton({ emp, milestone, entry }: {
  emp: { employeeId: string; name: string; reportingManager: string; doj: string; tenureDays: number };
  milestone: string;
  entry: { comment: string; postedOn: string };
}) {
  const [state, setState] = useState<ClarifySendState>("idle");
  const [errMsg, setErrMsg] = useState("");

  async function send(e: React.MouseEvent) {
    e.stopPropagation();
    setState("sending");
    setErrMsg("");
    try {
      const res = await fetch("/api/feedback-clarification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId:   emp.employeeId,
          employeeName: emp.name,
          managerName:  emp.reportingManager,
          doj:          emp.doj,
          tenureDays:   emp.tenureDays,
          milestone,
          feedbackText: entry.comment,
          postedOn:     entry.postedOn,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed");
      setState("sent");
      setTimeout(() => setState("idle"), 5000);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Error");
      setState("error");
      setTimeout(() => setState("idle"), 5000);
    }
  }

  function preview(e: React.MouseEvent) {
    e.stopPropagation();
    const p = new URLSearchParams({
      employeeId:   emp.employeeId,
      employeeName: emp.name,
      managerName:  emp.reportingManager,
      doj:          emp.doj,
      tenureDays:   String(emp.tenureDays),
      milestone,
      feedbackText: entry.comment,
      postedOn:     entry.postedOn,
    });
    window.open(`/api/feedback-clarification?${p}`, "_blank");
  }

  if (state === "sent") return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-green-50 text-green-700">
      ✓ Clarification sent
    </span>
  );
  if (state === "error") return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-red-50 text-red-600 cursor-default" title={errMsg}>
      ✕ Failed — {errMsg.slice(0, 60)}
    </span>
  );

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <button
        onClick={send}
        disabled={state === "sending"}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {state === "sending" ? "Sending…" : "Seek clarification"}
      </button>
      <button
        onClick={preview}
        title="Preview email"
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Preview
      </button>
    </div>
  );
}

function FeedbackAlert({ tenureDays, feedback, empName, empId, managerName, doj }: {
  tenureDays: number;
  feedback: Employee["feedback"];
  empName?: string;
  empId?: string;
  managerName?: string;
  doj?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [open]);

  if (tenureDays < 30) return <span className="text-gray-300 text-xs">—</span>;

  const missing: string[] = [];
  if (tenureDays >= 30 && !feedback.d30) missing.push("30d");
  if (tenureDays >= 60 && !feedback.d60) missing.push("60d");
  if (tenureDays >= 90 && !feedback.d90) missing.push("90d");

  const received = [feedback.d30, feedback.d60, feedback.d90].filter(Boolean);
  const qualities = received.map(e => getFeedbackQuality(e!));
  const hasBelow = qualities.some(q => q === "below");
  const hasAbove = qualities.some(q => q === "above");

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popupWidth = 380;
    let left = rect.left;
    if (left + popupWidth > window.innerWidth - 16) left = window.innerWidth - popupWidth - 16;
    setPos({ top: rect.bottom + 6, left });
    setOpen(v => !v);
  }

  let badgeClass = "";
  let badgeContent: React.ReactNode;

  if (missing.length > 0) {
    badgeClass = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
    badgeContent = (
      <>
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        {missing.join(" / ")} not submitted
      </>
    );
  } else if (hasBelow) {
    badgeClass = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
    badgeContent = (
      <>
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        Below Satisfactory
      </>
    );
  } else if (hasAbove) {
    badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
    badgeContent = (
      <>
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Above Satisfactory
      </>
    );
  } else {
    badgeClass = "bg-green-50 text-green-700 border-green-200 hover:bg-green-100";
    badgeContent = (
      <>
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Satisfactory
      </>
    );
  }

  const milestones = [
    { key: "d30", label: "30-Day Review", entry: feedback.d30, minDays: 30 },
    { key: "d60", label: "60-Day Review", entry: feedback.d60, minDays: 60 },
    { key: "d90", label: "90-Day Review", entry: feedback.d90, minDays: 90 },
  ] as const;

  const receivedCount = milestones.filter(m => m.entry).length;
  const pendingCount  = milestones.filter(m => !m.entry && tenureDays >= m.minDays).length;

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleClick}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${badgeClass}`}
      >
        {badgeContent}
      </button>

      {open && createPortal(
        <div
          ref={popupRef}
          onMouseDown={e => e.stopPropagation()}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: 380, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {empName ? `${empName} — Feedback` : "Feedback Timeline"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {receivedCount} received · {pendingCount > 0 ? `${pendingCount} pending` : "all submitted"}
              </p>
            </div>
            <button
              onMouseDown={e => { e.stopPropagation(); setOpen(false); }}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Milestones */}
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100 overscroll-contain">
            {milestones.map(m => {
              if (m.entry) {
                const q      = getFeedbackQuality(m.entry);
                const qColor = q === "below" ? "text-red-600"    : q === "above" ? "text-emerald-700" : "text-green-700";
                const qBg    = q === "below" ? "bg-red-50"       : q === "above" ? "bg-emerald-50"    : "bg-green-50";
                const qLabel = q === "below" ? "Below Satisfactory" : q === "above" ? "Above Satisfactory" : "Satisfactory";
                return (
                  <div key={m.key} className={`px-4 py-3 ${qBg}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-700">{m.label}</span>
                      <span className={`text-[10px] font-bold ${qColor}`}>{qLabel}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-1.5">{m.entry.postedOn}</p>
                    {m.entry.comment && (
                      <p className="text-xs text-gray-700 leading-snug mb-1.5">{m.entry.comment}</p>
                    )}
                    {m.entry.areaOfStrength && m.entry.areaOfStrength !== m.entry.comment && (
                      <p className="text-[10px] text-green-700 mb-0.5">
                        <span className="font-semibold">Strength: </span>{m.entry.areaOfStrength}
                      </p>
                    )}
                    {m.entry.areaOfImprovement && m.entry.areaOfImprovement !== m.entry.comment && (
                      <p className="text-[10px] text-amber-700">
                        <span className="font-semibold">Improve: </span>{m.entry.areaOfImprovement}
                      </p>
                    )}
                    {q === "below" && empId && empName && managerName && doj && m.entry.comment && (
                      <ClarifyButton
                        emp={{ employeeId: empId, name: empName, reportingManager: managerName, doj, tenureDays }}
                        milestone={m.label.replace(" Review", "")}
                        entry={{ comment: m.entry.comment, postedOn: m.entry.postedOn }}
                      />
                    )}
                  </div>
                );
              }
              const due = tenureDays >= m.minDays;
              return (
                <div key={m.key} className={due ? "px-4 py-3 bg-amber-50" : "px-4 py-3 bg-gray-50"}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">{m.label}</span>
                    <span className={`text-[10px] font-bold ${due ? "text-amber-600" : "text-gray-400"}`}>
                      {due ? "Pending" : "Not yet due"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 italic mt-1">
                    {due ? "Feedback not yet submitted" : `Available after day ${m.minDays}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── filter definitions ──────────────────────────────────────────────────────

function hasBelowSatisfactory(emp: Employee): boolean {
  const received = [emp.feedback.d30, emp.feedback.d60, emp.feedback.d90].filter(Boolean);
  return received.some(e => getFeedbackQuality(e!) === "below");
}

function hasMissingFeedback(emp: Employee): boolean {
  return (
    (emp.tenureDays >= 30 && !emp.feedback.d30) ||
    (emp.tenureDays >= 60 && !emp.feedback.d60) ||
    (emp.tenureDays >= 90 && !emp.feedback.d90)
  );
}

const FILTER_DEFS = [
  {
    key:   "below"            as const,
    label: "Below Satisfactory",
    match: hasBelowSatisfactory,
    off:   "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    on:    "bg-red-500 text-white border-red-500",
  },
  {
    key:   "pa_pip"           as const,
    label: "PA / PIP",
    match: (e: Employee) => e.pipStatus !== null,
    off:   "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    on:    "bg-amber-500 text-white border-amber-500",
  },
  {
    key:   "in_progress"      as const,
    label: "In Progress",
    match: (e: Employee) => e.finalStatus === "In Progress",
    off:   "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    on:    "bg-blue-500 text-white border-blue-500",
  },
  {
    key:   "closed"           as const,
    label: "Closed",
    match: (e: Employee) => e.finalStatus === "Confirmed",
    off:   "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100",
    on:    "bg-teal-500 text-white border-teal-500",
  },
  {
    key:   "feedback_missing" as const,
    label: "Feedback Pending",
    match: hasMissingFeedback,
    off:   "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
    on:    "bg-orange-500 text-white border-orange-500",
  },
];

type FilterKey = typeof FILTER_DEFS[number]["key"];

// ── feedback alert button ───────────────────────────────────────────────────

function FeedbackAlertButton({ emp }: { emp: Employee }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const missing: string[] = [];
  if (emp.tenureDays >= 30 && !emp.feedback.d30) missing.push("30-day");
  if (emp.tenureDays >= 60 && !emp.feedback.d60) missing.push("60-day");
  if (emp.tenureDays >= 90 && !emp.feedback.d90) missing.push("90-day");

  const send = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus("sending");
    setErrMsg("");
    try {
      const res = await fetch("/api/feedback-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId:        emp.employeeId,
          employeeName:      emp.name,
          managerName:       emp.reportingManager,
          doj:               emp.doj,
          tenureDays:        emp.tenureDays,
          missingMilestones: missing,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to send");
      setStatus("sent");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Error");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emp.employeeId, emp.name, emp.reportingManager, emp.doj, emp.tenureDays]);

  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
        ✓ Alert sent
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600" title={errMsg}>
        ✕ Failed
      </span>
    );
  }

  function openPreview(e: React.MouseEvent) {
    e.stopPropagation();
    const params = new URLSearchParams({
      employeeId:   emp.employeeId,
      employeeName: emp.name,
      managerName:  emp.reportingManager,
      doj:          emp.doj,
      tenureDays:   String(emp.tenureDays),
      milestones:   missing.join(","),
    });
    window.open(`/api/feedback-alert?${params}`, "_blank");
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={send}
        disabled={status === "sending"}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#e6f7f5] text-[#1E99C0] border border-[#28C5BE]/30 hover:bg-[#1E99C0] hover:text-white transition-colors disabled:opacity-50"
      >
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {status === "sending" ? "Sending…" : "Send alert"}
      </button>
      <button
        onClick={openPreview}
        title="Preview email draft"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors"
      >
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Preview
      </button>
    </div>
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
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [selected, setSelected] = useState<Employee | null>(null);
  const [employeeList, setEmployeeList] = useState<Employee[]>(employees);
  const category = employeeList[0]?.category;
  const showNR   = category === "sales";
  const showUtil = category === "trainer";
  const extraCols = (showNR || showUtil) ? 3 : 0;

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function syncScrollButtons() {
    const el = tableScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    syncScrollButtons();
    el.addEventListener("scroll", syncScrollButtons);
    window.addEventListener("resize", syncScrollButtons);
    return () => {
      el.removeEventListener("scroll", syncScrollButtons);
      window.removeEventListener("resize", syncScrollButtons);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleFilter(key: FilterKey) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

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
    if (q && !e.name.toLowerCase().includes(q) && !e.employeeId.toLowerCase().includes(q)) return false;
    if (activeFilters.size === 0) return true;
    return FILTER_DEFS.some(f => activeFilters.has(f.key) && f.match(e));
  });

  // Counts computed from full list (unaffected by search / other filters) — shown in chips
  const filterCounts = Object.fromEntries(
    FILTER_DEFS.map(f => [f.key, employeeList.filter(f.match).length])
  ) as Record<FilterKey, number>;

  return (
    <div>
      {/* Search + filter row */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or employee ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#28C5BE]/40 focus:border-[#28C5BE] bg-white shadow-sm w-72"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_DEFS.map(f => {
            const active = activeFilters.has(f.key);
            const count  = filterCounts[f.key];
            return (
              <button
                key={f.key}
                onClick={() => toggleFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? f.on : f.off}`}
              >
                {f.label}
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold ${active ? "bg-white/30" : "bg-white border border-current/20"}`}>
                  {count}
                </span>
              </button>
            );
          })}
          {activeFilters.size > 0 && (
            <button
              onClick={() => setActiveFilters(new Set())}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>


      <div className="relative">
        {/* Left scroll arrow */}
        <button
          onClick={() => tableScrollRef.current?.scrollBy({ left: -340, behavior: "smooth" })}
          disabled={!canScrollLeft}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 h-12 w-9 flex items-center justify-center bg-white border border-gray-200 rounded-r-xl shadow-md transition-all duration-200 ${canScrollLeft ? "text-gray-600 hover:text-[#1E99C0] hover:bg-[#e6f7f5] cursor-pointer" : "text-gray-300 cursor-default"}`}
          aria-label="Scroll left"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right scroll arrow */}
        <button
          onClick={() => tableScrollRef.current?.scrollBy({ left: 340, behavior: "smooth" })}
          disabled={!canScrollRight}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 h-12 w-9 flex items-center justify-center bg-white border border-gray-200 rounded-l-xl shadow-md transition-all duration-200 ${canScrollRight ? "text-gray-600 hover:text-[#1E99C0] hover:bg-[#e6f7f5] cursor-pointer" : "text-gray-300 cursor-default"}`}
          aria-label="Scroll right"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Left fade gradient */}
        <div className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent z-10 rounded-l-2xl pointer-events-none transition-opacity duration-200 ${canScrollLeft ? "opacity-100" : "opacity-0"}`} />
        {/* Right fade gradient */}
        <div className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-10 rounded-r-2xl pointer-events-none transition-opacity duration-200 ${canScrollRight ? "opacity-100" : "opacity-0"}`} />

      <div ref={tableScrollRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto scroll-smooth">
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
                    <div className="flex flex-col gap-1.5">
                      <FeedbackAlert
                        tenureDays={emp.tenureDays}
                        feedback={emp.feedback}
                        empName={emp.name}
                        empId={emp.employeeId}
                        managerName={emp.reportingManager}
                        doj={emp.doj}
                      />
                      {hasMissingFeedback(emp) && <FeedbackAlertButton emp={emp} />}
                    </div>
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
                      {emp.finalStatus === "Confirmed" ? "Closed" : emp.finalStatus}
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
      </div>{/* end relative scroll wrapper */}

      {selected && (
        <EmployeeModal
          employee={selected}
          onClose={() => { setSelected(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
