"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HRIncident } from "@/types/employee";

interface IncidentBadgeProps {
  empCode: string;
  empName: string;
}

interface PopupPos {
  top: number;
  left: number;
}

export default function IncidentBadge({ empCode, empName }: IncidentBadgeProps) {
  const [incidents, setIncidents] = useState<HRIncident[] | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopupPos>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!empCode) return;
    fetch(`/api/incidents?empCode=${empCode}`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setIncidents(res.data); })
      .catch(() => setIncidents([]));
  }, [empCode]);

  // Close on outside click or scroll
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

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    // Position popup below the button, aligned to its left edge
    // If too close to right edge, shift left
    const popupWidth = 400;
    let left = rect.left;
    if (left + popupWidth > window.innerWidth - 16) {
      left = window.innerWidth - popupWidth - 16;
    }
    setPos({ top: rect.bottom + 6, left });
    setOpen((v) => !v);
  }

  if (incidents === null) {
    return <span className="inline-block w-6 h-5 bg-gray-100 rounded animate-pulse" />;
  }

  const total = incidents.length;
  const neg   = incidents.filter((i) => i.type === "neg").length;
  const pos_  = incidents.filter((i) => i.type === "pos").length;

  const popup = open && total > 0 && (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: 400, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{empName} — HR Incidents</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {total} total &nbsp;·&nbsp;
            <span className="text-red-600">{neg} negative</span>
            &nbsp;·&nbsp;
            <span className="text-green-600">{pos_} positive</span>
          </p>
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

      {/* Incident rows */}
      <div className="max-h-72 overflow-y-auto">
        {incidents.map((inc, i) => (
          <div
            key={i}
            className={`px-4 py-3 border-b last:border-0 border-gray-100 ${
              inc.type === "neg" ? "bg-red-50" : "bg-green-50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-semibold uppercase tracking-wide ${
                inc.type === "neg" ? "text-red-600" : "text-green-600"
              }`}>
                {inc.type === "neg" ? "⚠ Negative Incident" : "✓ Positive Incident"}
              </span>
              <span className="text-xs text-gray-400">{inc.date}</span>
            </div>
            <p className={`text-sm leading-snug ${
              inc.type === "neg" ? "text-red-900" : "text-green-900"
            }`}>
              {inc.comment}
            </p>
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
        disabled={total === 0}
        className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold transition-colors ${
          total === 0
            ? "bg-gray-100 text-gray-400 cursor-default"
            : neg > 0
            ? "bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer"
            : "bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
        }`}
      >
        {total}
      </button>

      {typeof window !== "undefined" && popup
        ? createPortal(popup, document.body)
        : null}
    </>
  );
}
