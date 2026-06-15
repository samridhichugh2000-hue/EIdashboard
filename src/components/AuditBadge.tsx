"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AuditEntry } from "@/types/employee";

interface AuditBadgeProps {
  audits: AuditEntry[];
  empName: string;
}

// Map an audit rating to chip colors. Empty/null ratings render neutral.
function ratingClass(rating: string | null): string {
  switch ((rating ?? "").toLowerCase()) {
    case "below satisfactory": return "bg-red-100 text-red-700";
    case "satisfactory":       return "bg-amber-100 text-amber-700";
    case "role model":         return "bg-emerald-100 text-emerald-700";
    default:                   return "bg-gray-100 text-gray-500";
  }
}

export default function AuditBadge({ audits, empName }: AuditBadgeProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [open]);

  const total = audits.length;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popupWidth = 420;
    let left = rect.left;
    if (left + popupWidth > window.innerWidth - 16) left = window.innerWidth - popupWidth - 16;
    setPos({ top: rect.bottom + 6, left });
    setOpen((v) => !v);
  }

  if (total === 0) return <span className="text-gray-300 text-xs">—</span>;

  const popup = open && (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: 420, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{empName} — Enquiry Audits</p>
          <p className="text-xs text-gray-500 mt-0.5">{total} audit{total === 1 ? "" : "s"} since joining</p>
        </div>
        <button
          onMouseDown={(e) => { e.stopPropagation(); setOpen(false); }}
          className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {audits.map((a, i) => (
          <div key={i} className="px-4 py-3 border-b last:border-0 border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${ratingClass(a.rating)}`}>
                {a.rating || "No rating"}
              </span>
              <span className="text-xs text-gray-400">{a.date}</span>
            </div>
            {a.remark && <p className="text-sm leading-snug text-gray-700 whitespace-pre-line">{a.remark}</p>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleClick}
        title={`${total} enquiry audit${total === 1 ? "" : "s"} since joining — click to preview`}
        className="inline-flex items-center justify-center min-w-[1.5rem] px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer transition-colors"
      >
        {total}
      </button>
      {typeof window !== "undefined" && popup ? createPortal(popup, document.body) : null}
    </>
  );
}
